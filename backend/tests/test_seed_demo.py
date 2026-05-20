
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


@pytest.mark.django_db
def test_seed_demo_dev_login_creates_superuser_when_none() -> None:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    assert User.objects.count() == 0
    call_command("seed_demo", "--dev-login")
    u = User.objects.get(username="localadmin")
    assert u.is_superuser is True


@pytest.mark.django_db
def test_seed_demo_dev_login_skips_when_superuser_exists() -> None:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.create_superuser("existing", "e@e.com", "Existing-Admin-99!")
    call_command("seed_demo", "--dev-login")
    assert not User.objects.filter(username="localadmin").exists()
