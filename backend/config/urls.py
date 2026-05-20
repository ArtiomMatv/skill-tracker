"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView

from tracker.schema import schema
from tracker.views_auth import auth_login, auth_logout, auth_me, auth_register
from tracker.views_health import healthz

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz/", healthz),
    path("api/auth/me/", auth_me),
    path("api/auth/login/", auth_login),
    path("api/auth/logout/", auth_logout),
    path("api/auth/register/", auth_register),
    path(
        "graphql/",
        csrf_exempt(GraphQLView.as_view(graphiql=True, schema=schema)),
    ),
]
