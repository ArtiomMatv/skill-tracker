"""Tests for ``tracker.models`` (Employee, Skill, Assessment validation)."""

from datetime import date

import pytest
from django.core.exceptions import ValidationError

from tracker.models import Assessment, Employee, Skill


@pytest.mark.django_db
def test_assessment_valid_score_saves() -> None:
    emp = Employee.objects.create(name="Test User")
    skill = Skill.objects.create(name="Python")
    a = Assessment(employee=emp, skill=skill, score=3, date=date(2026, 1, 10))
    a.full_clean()
    a.save()
    assert Assessment.objects.count() == 1


@pytest.mark.django_db
def test_assessment_score_below_one_raises() -> None:
    emp = Employee.objects.create(name="A")
    skill = Skill.objects.create(name="B")
    a = Assessment(employee=emp, skill=skill, score=0, date=date(2026, 1, 1))
    with pytest.raises(ValidationError):
        a.full_clean()


@pytest.mark.django_db
def test_assessment_score_above_five_raises() -> None:
    emp = Employee.objects.create(name="A")
    skill = Skill.objects.create(name="B")
    a = Assessment(employee=emp, skill=skill, score=6, date=date(2026, 1, 1))
    with pytest.raises(ValidationError):
        a.full_clean()
