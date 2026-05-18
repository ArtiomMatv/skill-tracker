import pytest
from django.test import Client


@pytest.fixture
def graphql_client() -> Client:
    """HTTP client with host allowed by Django dev settings."""
    return Client(HTTP_HOST="localhost")
