import json

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import (
    MinimumLengthValidator,
    validate_password,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


def _registration_allowed() -> bool:
    return bool(settings.DEBUG or getattr(settings, "ALLOW_REGISTER", False))


def _registration_password_validators():
    """Looser rules for local/demo registration (still min 8 chars)."""
    return [MinimumLengthValidator(min_length=8)]


REGISTRATION_PASSWORD_HINT = (
    "At least 8 characters. Example for local dev: Local-only-Auth-2026!"
)


@require_http_methods(["GET"])
def auth_me(request):
    u = request.user
    reg = _registration_allowed()
    require_auth = bool(getattr(settings, "REQUIRE_AUTH", False))
    if u.is_authenticated:
        return JsonResponse(
            {
                "authenticated": True,
                "username": u.get_username(),
                "registerAvailable": reg,
                "requireAuth": require_auth,
            }
        )
    return JsonResponse(
        {
            "authenticated": False,
            "registerAvailable": reg,
            "requireAuth": require_auth,
            "passwordHint": REGISTRATION_PASSWORD_HINT if reg else None,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def auth_login(request):
    """JSON login for the SPA (csrf_exempt for demo; use CSRF in hardened deployments)."""
    try:
        body = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"ok": False, "error": "Invalid credentials"}, status=401)
    login(request, user)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def auth_register(request):
    """Create a normal Django user and start a session (DEBUG or ALLOW_REGISTER=1 only)."""
    if not _registration_allowed():
        return JsonResponse({"ok": False, "error": "Registration disabled"}, status=403)
    try:
        body = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    password2 = body.get("passwordConfirm") or body.get("password_confirm") or ""

    if len(username) < 2:
        return JsonResponse(
            {"ok": False, "error": "Username must be at least 2 characters."}, status=400
        )
    if not password:
        return JsonResponse({"ok": False, "error": "Password is required."}, status=400)
    if password != password2:
        return JsonResponse({"ok": False, "error": "Passwords do not match."}, status=400)

    User = get_user_model()
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"ok": False, "error": "That username is already taken."}, status=409)

    try:
        validate_password(
            password,
            user=User(username=username),
            password_validators=_registration_password_validators(),
        )
    except DjangoValidationError as e:
        return JsonResponse(
            {
                "ok": False,
                "error": " ".join(e.messages),
                "passwordHint": REGISTRATION_PASSWORD_HINT,
            },
            status=400,
        )

    user = User.objects.create_user(username=username, password=password)
    login(request, user)
    return JsonResponse({"ok": True, "username": user.get_username()})

