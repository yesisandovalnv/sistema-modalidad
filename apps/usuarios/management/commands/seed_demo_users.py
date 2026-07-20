from django.core.management.base import BaseCommand
from django.db import transaction

from apps.usuarios.models import CustomUser, Role


STUDENT_ROLE = {
    "codigo": "ESTUDIANTE",
    "nombre": "Estudiante",
    "descripcion": "Estudiante habilitado para participar en procesos de modalidad de titulacion.",
    "activo": True,
}

DEMO_STUDENT = {
    "username": "estudiante.demo",
    "nombres": "Ana Maria",
    "apellido_paterno": "Quispe",
    "apellido_materno": "Mamani",
    "ru": "20260001",
    "ci": "9900001",
    "is_active": True,
    "activo": True,
}


class Command(BaseCommand):
    help = "Crea o actualiza los usuarios minimos de demostracion sin duplicarlos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--student-password",
            default="EstudianteDemo123!",
            help="Contrasena del estudiante demo (solo se actualiza si no coincide).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        role, role_created, role_updated = self._upsert_role()
        student, student_created, student_updated = self._upsert_student(
            role=role,
            password=options["student_password"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Datos demo preparados: "
                f"rol={self._status(role_created, role_updated)}, "
                f"usuario={self._status(student_created, student_updated)} "
                f"(username={student.username}, id={student.pk})."
            )
        )

    @staticmethod
    def _status(created, updated):
        if created:
            return "creado"
        if updated:
            return "actualizado"
        return "sin cambios"

    @staticmethod
    def _apply_changes(instance, expected):
        changed_fields = []
        for field, value in expected.items():
            if getattr(instance, field) != value:
                setattr(instance, field, value)
                changed_fields.append(field)
        return changed_fields

    def _upsert_role(self):
        role = Role.all_objects.filter(codigo=STUDENT_ROLE["codigo"]).first()
        created = role is None
        if created:
            role = Role.all_objects.create(**STUDENT_ROLE)
            return role, True, False

        changed_fields = self._apply_changes(
            role,
            {key: value for key, value in STUDENT_ROLE.items() if key != "codigo"},
        )
        if changed_fields:
            role.save(update_fields=[*changed_fields, "updated_at"])
        return role, False, bool(changed_fields)

    def _upsert_student(self, role, password):
        student = CustomUser.all_objects.filter(username=DEMO_STUDENT["username"]).first()
        created = student is None
        if created:
            student = CustomUser.objects.create_user(
                password=password,
                role=role,
                **DEMO_STUDENT,
            )
            return student, True, False

        changed_fields = self._apply_changes(student, {**DEMO_STUDENT, "role": role})
        if not student.check_password(password):
            student.set_password(password)
            changed_fields.append("password")
        if changed_fields:
            student.save(update_fields=[*changed_fields, "updated_at"])
        return student, False, bool(changed_fields)
