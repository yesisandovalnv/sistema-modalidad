"""Validación y confirmación de importaciones de estudiantes desde XLSX."""

import hashlib
import json
import uuid
import zipfile
from collections import Counter, defaultdict
from io import BytesIO

from django.core import signing
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, connection, transaction
from django.db.models.functions import Trim, Upper
from django.utils import timezone
from openpyxl import Workbook, load_workbook
from openpyxl.cell.cell import TYPE_FORMULA
from rest_framework import serializers

from apps.usuarios.models import AuditLog, CustomUser, Role
from apps.usuarios.serializers import UserAdminSerializer
from apps.usuarios.student_auth import normalize_ci, normalize_ru


HEADERS = (
    "Nombres", "Apellido paterno", "Apellido materno", "CI", "RU",
    "Correo institucional", "Correo personal",
)
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_STUDENTS = 1000
LOT_SALT = "usuarios.student-import.v1"


def build_template():
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Estudiantes"
    sheet.append(HEADERS)
    for row in range(2, MAX_STUDENTS + 2):
        sheet.cell(row, 4).number_format = "@"
        sheet.cell(row, 5).number_format = "@"
    instructions = workbook.create_sheet("Instrucciones")
    instructions.append(["Complete los datos en la hoja Estudiantes."])
    instructions.append(["CI y RU deben ingresarse como texto para conservar ceros iniciales."])
    instructions.append(["No agregue, quite ni reordene columnas; no use fórmulas."])
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def _clean(value):
    return "" if value is None else str(value).strip()


def _row_error(row, message):
    row["errors"].append(message)


def _existing_conflicts(rows):
    rus = {row["ru_normalized"] for row in rows if row["ru_normalized"]}
    cis = {row["ci_normalized"] for row in rows if row["ci_normalized"]}
    usernames = {normalize_ru(row["ru"]) for row in rows if row["ru"]}
    conflicts = defaultdict(set)
    for user in CustomUser.all_objects.annotate(normalized_ru=Upper(Trim("ru"))).filter(normalized_ru__in=rus):
        conflicts[user.normalized_ru].add("RU ya registrado por un usuario existente")
    for user in CustomUser.all_objects.annotate(normalized_ci=Trim("ci")).filter(normalized_ci__in=cis):
        conflicts[f"ci:{user.normalized_ci}"].add("CI ya registrado por un usuario existente")
    for user in CustomUser.all_objects.filter(username__in=usernames):
        conflicts[f"username:{user.username}"].add("El username derivado del RU ya está registrado")
    return conflicts


def validate_workbook(upload):
    if upload.size > MAX_FILE_BYTES:
        raise serializers.ValidationError("El archivo supera el límite de 2 MB.")
    if not upload.name.lower().endswith(".xlsx"):
        raise serializers.ValidationError("Seleccione un archivo .xlsx.")
    try:
        with zipfile.ZipFile(upload) as archive:
            if sum(item.file_size for item in archive.infolist()) > 25 * 1024 * 1024:
                raise serializers.ValidationError("El contenido descomprimido supera el límite permitido.")
            if any("vbaproject" in item.filename.lower() or "externallinks" in item.filename.lower() for item in archive.infolist()):
                raise serializers.ValidationError("No se permiten macros ni vínculos externos.")
    except zipfile.BadZipFile as exc:
        raise serializers.ValidationError("El archivo no es un XLSX válido o está dañado.") from exc
    finally:
        upload.seek(0)
    try:
        workbook = load_workbook(upload, read_only=True, data_only=False)
    except Exception as exc:
        raise serializers.ValidationError("El archivo no es un XLSX válido o está dañado.") from exc
    try:
        sheet = workbook["Estudiantes"] if "Estudiantes" in workbook.sheetnames else workbook.active
        first = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), ())
        if tuple(first) != HEADERS:
            raise serializers.ValidationError({"columns": "Las columnas deben coincidir exactamente con la plantilla."})
        rows = []
        for row_number, cells in enumerate(sheet.iter_rows(min_row=2), start=2):
            if all(cell.value is None for cell in cells):
                continue
            if row_number > MAX_STUDENTS + 1:
                raise serializers.ValidationError(f"El archivo excede el máximo de {MAX_STUDENTS} filas de datos.")
            if len(rows) >= MAX_STUDENTS:
                raise serializers.ValidationError(f"El archivo excede el máximo de {MAX_STUDENTS} estudiantes.")
            errors = []
            for cell in cells:
                if cell.data_type == TYPE_FORMULA:
                    errors.append("No se permiten fórmulas.")
                    break
            for cell in cells[:len(HEADERS)]:
                if cell.value is not None and cell.data_type not in {"s", "inlineStr"}:
                    if cell.column in (4, 5) and cell.data_type == "n":
                        errors.append(f"{HEADERS[cell.column - 1]} debe estar almacenado como texto; no se pueden reconstruir ceros iniciales.")
                    else:
                        errors.append(f"La columna {HEADERS[cell.column - 1]} debe contener texto.")
            values = [_clean(cell.value) for cell in cells[:len(HEADERS)]]
            if len(cells) != len(HEADERS):
                errors.append("La fila tiene una cantidad incorrecta de columnas.")
            record = dict(zip(("nombres", "apellido_paterno", "apellido_materno", "ci", "ru", "correo_institucional", "correo_personal"), values))
            record["ci"] = normalize_ci(record["ci"])
            record["ru"] = normalize_ru(record["ru"])
            record.update(row_number=row_number, errors=errors)
            for field, label in (("nombres", "Nombres"), ("apellido_paterno", "Apellido paterno"), ("apellido_materno", "Apellido materno"), ("ci", "CI"), ("ru", "RU")):
                if not record[field]:
                    _row_error(record, f"{label} es obligatorio.")
            for field, label in (("ci", "CI"), ("ru", "RU")):
                cell = cells[3 if field == "ci" else 4]
                if cell.value is not None and cell.data_type == "n":
                    _row_error(record, f"{label} debe estar almacenado como texto; no se pueden reconstruir ceros iniciales.")
            for field, limit in (("nombres", 150), ("apellido_paterno", 100), ("apellido_materno", 100), ("ci", 20), ("ru", 20), ("correo_institucional", 254), ("correo_personal", 254)):
                if len(record[field]) > limit:
                    _row_error(record, f"{field} supera {limit} caracteres.")
            for field in ("correo_institucional", "correo_personal"):
                if record[field]:
                    try:
                        validate_email(record[field])
                    except DjangoValidationError:
                        _row_error(record, f"{field} no tiene un formato de correo válido.")
            record["ci_normalized"] = normalize_ci(record["ci"])
            record["ru_normalized"] = normalize_ru(record["ru"])
            rows.append(record)
        if not rows:
            raise serializers.ValidationError("El archivo no contiene estudiantes.")

        for field, key, message in (
            ("ru", "ru_normalized", "RU duplicado dentro del archivo (incluidas variantes equivalentes)."),
            ("ci", "ci_normalized", "CI duplicado dentro del archivo."),
        ):
            counts = Counter(row[key] for row in rows if row[key])
            for row in rows:
                if row[key] and counts[row[key]] > 1:
                    _row_error(row, message)
        conflicts = _existing_conflicts(rows)
        for row in rows:
            for message in conflicts.get(row["ru_normalized"], ()):
                _row_error(row, message)
            for message in conflicts.get(f"ci:{row['ci_normalized']}", ()):
                _row_error(row, message)
            for message in conflicts.get(f"username:{row['ru']}", ()):
                _row_error(row, message)

        for row in rows:
            row["valid"] = not row["errors"]
        lot_id = str(uuid.uuid4())
        safe_rows = [{key: row[key] for key in ("row_number", "nombres", "apellido_paterno", "apellido_materno", "ci", "ru", "correo_institucional", "correo_personal", "valid", "errors")} for row in rows]
        token = signing.dumps({"lot": lot_id, "rows": safe_rows}, salt=LOT_SALT, compress=True)
        return {"lot_id": lot_id, "token": token, "total": len(rows), "valid": sum(row["valid"] for row in safe_rows), "rejected": sum(not row["valid"] for row in safe_rows), "rows": safe_rows}
    finally:
        workbook.close()


def _advisory_lock(key):
    if connection.vendor == "postgresql":
        lock_key = int.from_bytes(hashlib.sha256(key.encode("utf-8")).digest()[:8], "big", signed=True)
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_key])


def confirm_import(token, actor, request):
    try:
        payload = signing.loads(token, salt=LOT_SALT, max_age=60 * 60)
    except signing.BadSignature as exc:
        raise serializers.ValidationError("La validación venció o no es válida. Valide el archivo nuevamente.") from exc
    lot_id = payload.get("lot")
    rows = payload.get("rows", [])
    marker = f"lote={lot_id}"
    with transaction.atomic():
        _advisory_lock(f"student-import:{lot_id}")
        if connection.vendor == "postgresql":
            with connection.cursor() as cursor:
                table_name = connection.ops.quote_name(CustomUser._meta.db_table)
                cursor.execute(f"LOCK TABLE {table_name} IN SHARE ROW EXCLUSIVE MODE")
        existing = AuditLog.objects.filter(modulo="Usuarios", accion="IMPORTAR_ESTUDIANTES", descripcion__contains=marker).first()
        if existing:
            try:
                result = json.loads(existing.descripcion.split("; resultado=", 1)[1])
                result["already_confirmed"] = True
                return result
            except (IndexError, json.JSONDecodeError):
                raise serializers.ValidationError("El lote ya fue confirmado y su resultado requiere revisión administrativa.")

        role = Role.all_objects.filter(codigo="ESTUDIANTE", activo=True).first()
        if not role:
            raise serializers.ValidationError("No existe un rol ESTUDIANTE activo.")
        valid_rows = [row for row in rows if row.get("valid")]
        lock_values = sorted({f"ru:{normalize_ru(row['ru'])}" for row in valid_rows} | {f"ci:{normalize_ci(row['ci'])}" for row in valid_rows})
        for key in lock_values:
            _advisory_lock(key)

        results = []
        created = 0
        for row in rows:
            errors = list(row.get("errors", []))
            if row.get("valid"):
                ru = normalize_ru(row["ru"])
                ci = normalize_ci(row["ci"])
                if CustomUser.all_objects.annotate(normalized_ru=Upper(Trim("ru"))).filter(normalized_ru=ru.upper()).exists():
                    errors.append("RU ya registrado antes de confirmar.")
                if CustomUser.all_objects.annotate(normalized_ci=Trim("ci")).filter(normalized_ci=ci).exists():
                    errors.append("CI ya registrado antes de confirmar.")
                if CustomUser.all_objects.filter(username=ru).exists():
                    errors.append("El username derivado del RU ya está registrado.")
                if not errors:
                    values = {key: row[key] for key in ("nombres", "apellido_paterno", "apellido_materno", "ci", "correo_institucional", "correo_personal")}
                    values.update(username=ru, ru=ru, role_id=role.pk, is_active=True, is_staff=False, is_superuser=False)
                    try:
                        with transaction.atomic():
                            serializer = UserAdminSerializer(data=values, context={"student_import": True})
                            serializer.is_valid(raise_exception=True)
                            serializer.save()
                        created += 1
                    except IntegrityError:
                        errors.append("Conflicto de integridad durante la confirmación; vuelva a validar el lote.")
                    except (serializers.ValidationError, DjangoValidationError) as exc:
                        detail = getattr(exc, "detail", None)
                        errors.extend([str(item) for item in (detail.values() if isinstance(detail, dict) else [detail or exc])])
            results.append({"row_number": row["row_number"], "created": row.get("valid") and not errors, "errors": errors})

        rejected = sum(not row["created"] for row in results)
        result = {"lot_id": lot_id, "total": len(rows), "created": created, "rejected": rejected, "rows": results, "already_confirmed": False}
        description = f"lote={lot_id}; filas={len(rows)}; creados={created}; rechazados={rejected}; resultado={json.dumps(result, ensure_ascii=False)}"
        AuditLog.objects.create(
            usuario=actor,
            accion="IMPORTAR_ESTUDIANTES",
            modulo="Usuarios",
            descripcion=description,
            ip_address=request.META.get("REMOTE_ADDR") or None,
            metodo_http=request.method,
            url=request.path[:300],
        )
        return result
