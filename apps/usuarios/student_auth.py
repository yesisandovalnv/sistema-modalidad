import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import password_validation
from django.core.mail import EmailMessage, get_connection
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models.functions import Trim, Upper
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import APIException
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.usuarios.models import CustomUser, StudentAccountActivation, StudentLoginThrottle


logger = logging.getLogger("security.student_login")

GENERIC_ERROR = "No fue posible iniciar sesión con los datos proporcionados."
ACCOUNT_FAILURE_LIMIT = 3
ORIGIN_FAILURE_LIMIT = 10
WINDOW_DURATION = timedelta(minutes=15)
CODE_FAILURE_LIMIT = 5
CODE_RESEND_DELAY = timedelta(seconds=60)


class StudentLoginRejected(APIException):
    status_code = 401
    default_detail = GENERIC_ERROR
    default_code = "authentication_failed"


def normalize_ru(value: str) -> str:
    return str(value or "").strip().upper()


def normalize_ci(value: str) -> str:
    return str(value or "").strip()


def _digest(scope: str, value: str) -> str:
    payload = f"student-login:{scope}:{value}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _origin(request) -> str:
    # REMOTE_ADDR proviene del servidor; no se confía en X-Forwarded-For.
    return str(request.META.get("REMOTE_ADDR") or "unknown")


def _locked_state(scope: str, digest: str) -> StudentLoginThrottle:
    state, _ = StudentLoginThrottle.objects.select_for_update().get_or_create(
        scope=scope,
        key_digest=digest,
        defaults={"activo": True},
    )
    return state


def _is_blocked(state: StudentLoginThrottle, now) -> bool:
    if state.blocked_until and state.blocked_until > now:
        return True
    if state.blocked_until or (state.window_started_at and state.window_started_at + WINDOW_DURATION <= now):
        state.failed_attempts = 0
        state.window_started_at = None
        state.blocked_until = None
        state.save(update_fields=["failed_attempts", "window_started_at", "blocked_until", "updated_at"])
    return False


def _register_failure(state: StudentLoginThrottle, limit: int, now) -> None:
    if not state.window_started_at or state.window_started_at + WINDOW_DURATION <= now:
        state.failed_attempts = 0
        state.window_started_at = now
    state.failed_attempts += 1
    if state.failed_attempts >= limit:
        state.blocked_until = now + WINDOW_DURATION
    state.save(update_fields=["failed_attempts", "window_started_at", "blocked_until", "updated_at"])


def _reset_account(state: StudentLoginThrottle) -> None:
    if state.failed_attempts or state.window_started_at or state.blocked_until:
        state.failed_attempts = 0
        state.window_started_at = None
        state.blocked_until = None
        state.save(update_fields=["failed_attempts", "window_started_at", "blocked_until", "updated_at"])


def _student_ci_matches(user, ci: str) -> bool:
    normalized_ci = normalize_ci(ci)
    stored_ci = normalize_ci(user.ci) if user else "invalid-student-ci"
    return bool(user) and constant_time_compare(stored_ci, normalized_ci)


def _find_student(*, ru: str, ci: str):
    normalized_ru = normalize_ru(ru)
    normalized_ci = normalize_ci(ci)
    candidates = list(
        CustomUser.all_objects.annotate(normalized_ru=Upper(Trim("ru")))
        .filter(
            normalized_ru=normalized_ru,
            role__codigo="ESTUDIANTE",
            is_active=True,
            activo=True,
            is_staff=False,
            is_superuser=False,
        )
        .select_related("role")[:2]
    )
    if len(candidates) != 1:
        return None
    user = candidates[0]
    return user if constant_time_compare(normalize_ci(user.ci), normalized_ci) else None


def _code_digest(user, code: str, purpose: str) -> str:
    payload = "|".join((
        "student-code-v1",
        purpose,
        str(user.pk),
        normalize_ru(user.ru),
        str(user.correo_institucional or "").strip().lower(),
        str(user.password or ""),
        str(code),
    )).encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _code_budget(*, ru: str, request, stage: str) -> bool:
    """Persist a bounded per-account and per-origin budget without storing raw IDs."""
    now = timezone.now()
    account_digest = _digest("student-code-account", normalize_ru(ru))
    origin_digest = _digest("student-code-origin", _origin(request))
    account_limit = int(getattr(settings, "STUDENT_CODE_ACCOUNT_LIMIT", 5))
    origin_limit = int(getattr(settings, "STUDENT_CODE_ORIGIN_LIMIT", 10))
    with transaction.atomic():
        origin_state = _locked_state(StudentLoginThrottle.Scope.ORIGIN, origin_digest)
        account_state = _locked_state(StudentLoginThrottle.Scope.ACCOUNT, account_digest)
        if _is_blocked(origin_state, now) or _is_blocked(account_state, now):
            return False
        _register_failure(origin_state, origin_limit, now)
        _register_failure(account_state, account_limit, now)
    return True


def _clear_code(state, *, used_at=None):
    state.code_digest = ""
    state.expires_at = None
    state.failed_attempts = 0
    state.activo = False
    state.used_at = used_at
    state.save(update_fields=["code_digest", "expires_at", "failed_attempts", "activo", "used_at", "updated_at"])


def _request_student_code(*, ru: str, ci: str, request, purpose: str) -> None:
    if purpose not in {"activation", "recovery"}:
        raise ValueError("Unsupported student code purpose")
    if not _code_budget(ru=ru, request=request, stage=f"{purpose}_request"):
        return
    candidate = _find_student(ru=ru, ci=ci)
    if not candidate:
        return

    now = timezone.now()
    with transaction.atomic():
        user = CustomUser.all_objects.select_for_update().get(pk=candidate.pk)
        state, _ = StudentAccountActivation.objects.select_for_update().get_or_create(
            user=user,
            defaults={"activo": True},
        )
        can_activate = purpose == "activation" and not user.has_usable_password()
        can_recover = purpose == "recovery" and user.has_usable_password()
        email = (user.correo_institucional or "").strip()
        if not (can_activate or can_recover) or not email:
            return

        window_duration = timedelta(minutes=int(getattr(settings, "STUDENT_CODE_WINDOW_MINUTES", 15)))
        request_limit = int(getattr(settings, "STUDENT_CODE_REQUEST_LIMIT", 5))
        if state.request_window_started_at and state.request_window_started_at + window_duration <= now:
            state.request_window_started_at = None
            state.requests_in_window = 0
        if state.requests_in_window >= request_limit:
            return
        resend_delay = timedelta(seconds=int(getattr(settings, "STUDENT_CODE_RESEND_SECONDS", CODE_RESEND_DELAY.total_seconds())))
        if state.last_sent_at and state.last_sent_at + resend_delay > now:
            return

        code = f"{secrets.randbelow(1_000_000):06d}"
        ttl = int(getattr(settings, "STUDENT_CODE_TTL_SECONDS", 600))
        state.code_digest = _code_digest(user, code, purpose)
        state.password_snapshot = user.password
        state.expires_at = now + timedelta(seconds=ttl)
        state.failed_attempts = 0
        state.last_sent_at = now
        state.request_window_started_at = state.request_window_started_at or now
        state.requests_in_window += 1
        state.used_at = None
        state.activo = True
        state.save(update_fields=[
            "code_digest", "password_snapshot", "expires_at", "failed_attempts", "last_sent_at",
            "request_window_started_at", "requests_in_window", "used_at", "activo", "updated_at",
        ])
        subject = "Código para activar tu cuenta" if purpose == "activation" else "Código para recuperar tu cuenta"
        message = f"Tu código es {code}. Vence en {max(1, ttl // 60)} minutos. Si no solicitaste este código, ignora este mensaje."
        try:
            EmailMessage(subject, message, to=[email], connection=get_connection()).send(fail_silently=False)
        except Exception:
            _clear_code(state)


def request_student_activation(*, ru: str, ci: str, request) -> None:
    _request_student_code(ru=ru, ci=ci, request=request, purpose="activation")


def request_student_recovery(*, ru: str, ci: str, request) -> None:
    _request_student_code(ru=ru, ci=ci, request=request, purpose="recovery")


def _confirm_student_code(*, ru: str, ci: str, code: str, password: str, request, purpose: str) -> None:
    if purpose not in {"activation", "recovery"}:
        raise ValueError("Unsupported student code purpose")
    if not _code_budget(ru=ru, request=request, stage=f"{purpose}_confirm"):
        raise StudentLoginRejected(GENERIC_ERROR)
    candidate = _find_student(ru=ru, ci=ci)
    if not candidate:
        raise StudentLoginRejected(GENERIC_ERROR)

    now = timezone.now()
    rejected = False
    with transaction.atomic():
        user = CustomUser.all_objects.select_for_update().get(pk=candidate.pk)
        state = StudentAccountActivation.objects.select_for_update().filter(user=user).first()
        if not state or not state.activo or not state.code_digest:
            rejected = True
        else:
            other_purpose = "recovery" if purpose == "activation" else "activation"
            if constant_time_compare(state.code_digest, _code_digest(user, code, other_purpose)):
                raise StudentLoginRejected(GENERIC_ERROR)

            snapshot = getattr(state, "password_snapshot", "")
            if snapshot and snapshot != user.password:
                _clear_code(state)
                rejected = True
            else:
                allowed = (purpose == "activation" and not user.has_usable_password()) or (
                    purpose == "recovery" and user.has_usable_password()
                )
                if not allowed or not state.expires_at or state.expires_at <= now or state.failed_attempts >= CODE_FAILURE_LIMIT:
                    _clear_code(state)
                    rejected = True
                else:
                    expected = _code_digest(user, code, purpose)
                    if not constant_time_compare(state.code_digest, expected):
                        state.failed_attempts += 1
                        if state.failed_attempts >= CODE_FAILURE_LIMIT:
                            _clear_code(state)
                        else:
                            state.save(update_fields=["failed_attempts", "updated_at"])
                        rejected = True
                    else:
                        try:
                            password_validation.validate_password(password, user)
                        except DjangoValidationError as exc:
                            raise serializers.ValidationError(exc.messages) from exc
                        user.set_password(password)
                        user.save(update_fields=["password", "updated_at"])
                        if purpose == "recovery":
                            for token in OutstandingToken.objects.filter(user=user):
                                BlacklistedToken.objects.get_or_create(token=token)
                        _clear_code(state, used_at=now)
    if rejected:
        raise StudentLoginRejected(GENERIC_ERROR)


def authenticate_student(*, ru: str, ci: str, request):
    normalized_ru = normalize_ru(ru)
    now = timezone.now()
    origin_digest = _digest(StudentLoginThrottle.Scope.ORIGIN, _origin(request))
    account_digest = _digest(StudentLoginThrottle.Scope.ACCOUNT, normalized_ru)

    rejection_reason = None
    tokens = None
    with transaction.atomic():
        origin_state = _locked_state(StudentLoginThrottle.Scope.ORIGIN, origin_digest)
        if _is_blocked(origin_state, now):
            rejection_reason = "origin_blocked"
        else:
            candidates = list(
                CustomUser.all_objects.annotate(normalized_ru=Upper(Trim("ru")))
                .filter(
                    normalized_ru=normalized_ru,
                    role__codigo="ESTUDIANTE",
                    is_active=True,
                    activo=True,
                    is_staff=False,
                    is_superuser=False,
                )
                .select_related("role")[:2]
            )
            account_state = _locked_state(StudentLoginThrottle.Scope.ACCOUNT, account_digest)
            if _is_blocked(account_state, now):
                rejection_reason = "account_blocked"
            else:
                user = candidates[0] if len(candidates) == 1 else None
                credentials_match = _student_ci_matches(user, ci)
                if not credentials_match:
                    _register_failure(origin_state, ORIGIN_FAILURE_LIMIT, now)
                    _register_failure(account_state, ACCOUNT_FAILURE_LIMIT, now)
                    rejection_reason = "invalid_credentials"
                else:
                    _reset_account(account_state)
                    user.last_login = now
                    user.save(update_fields=["last_login"])
                    refresh = RefreshToken.for_user(user)
                    tokens = {"refresh": str(refresh), "access": str(refresh.access_token)}

    if rejection_reason:
        logger.warning("student_login_rejected reason=%s", rejection_reason)
        raise StudentLoginRejected(GENERIC_ERROR)
    logger.info("student_login_succeeded user_id=%s", user.pk)
    return tokens
