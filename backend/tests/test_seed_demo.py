"""Smoke test for ``seed_demo`` management command."""

import pytest
from django.core.management import call_command

from tracker.models import Assessment, Employee, Skill


@pytest.mark.django_db
def test_seed_demo_creates_data() -> None:
    call_command("seed_demo")
    assert Employee.objects.count() >= 4
    assert Skill.objects.count() >= 4
    assert Assessment.objects.count() >= 10


@pytest.mark.django_db
def test_seed_demo_idempotent() -> None:
    call_command("seed_demo")
    n1 = Assessment.objects.count()
    call_command("seed_demo")
    n2 = Assessment.objects.count()
    assert n1 == n2
