import hashlib
import hmac
import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models.functions import Trim, Upper
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.tokens import RefreshToken

from apps.usuarios.models import CustomUser, StudentLoginThrottle


logger = logging.getLogger("security.student_login")

GENERIC_ERROR = "No fue posible iniciar sesión con los datos proporcionados."
ACCOUNT_FAILURE_LIMIT = 3
ORIGIN_FAILURE_LIMIT = 10
WINDOW_DURATION = timedelta(minutes=15)


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


def authenticate_student(*, ru: str, ci: str, request):
    normalized_ru = normalize_ru(ru)
    normalized_ci = normalize_ci(ci)
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
                stored_ci = normalize_ci(user.ci) if user else "invalid-student-ci"
                credentials_match = bool(user) and constant_time_compare(stored_ci, normalized_ci)
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
