"""Optional GraphQL auth gate (``REQUIRE_AUTH=1``)."""

from django.conf import settings
from django.http import JsonResponse


class RequireAuthMiddleware:
    """Return 401 JSON for unauthenticated POSTs to ``/graphql/`` when required."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            getattr(settings, "REQUIRE_AUTH", False)
            and request.path.startswith("/graphql/")
            and request.method == "POST"
            and not getattr(request, "user", None).is_authenticated
        ):
            return JsonResponse(
                {"errors": [{"message": "Authentication required"}]},
                status=401,
                content_type="application/json",
            )
        return self.get_response(request)
