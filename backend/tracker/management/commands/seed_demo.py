from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from tracker.models import Assessment, Employee, Skill

# Used only with --dev-login when no superuser exists (local REQUIRE_AUTH demos).
DEV_SUPERUSER_USERNAME = "localadmin"
DEV_SUPERUSER_EMAIL = "localadmin@localhost.invalid"
DEV_SUPERUSER_PASSWORD = "Local-only-Auth-2026!"

# (employee_name, skill_name, score, date) — unique (emp, skill, date) per row for get_or_create
SEED_ASSESSMENTS: list[tuple[str, str, int, date]] = [
    ("Ada Lovelace", "Python", 4, date(2026, 4, 1)),
    ("Ada Lovelace", "GraphQL", 2, date(2026, 4, 15)),
    ("Ada Lovelace", "GraphQL", 3, date(2026, 5, 1)),
    ("Grace Hopper", "Python", 5, date(2026, 3, 20)),
    ("Grace Hopper", "Django", 2, date(2026, 4, 10)),
    ("Bob Martin", "Python", 3, date(2026, 5, 5)),
    ("Bob Martin", "Safety", 2, date(2026, 5, 6)),
    ("Bob Martin", "Safety", 2, date(2026, 5, 7)),
    ("Nadia K", "GraphQL", 4, date(2026, 5, 8)),
    ("Nadia K", "Django", 3, date(2026, 5, 9)),
]

EMPLOYEE_NAMES = sorted({e for e, _, _, _ in SEED_ASSESSMENTS})
SKILL_NAMES = sorted({s for _, s, _, _ in SEED_ASSESSMENTS})


class Command(BaseCommand):
    help = "Create demo employees, skills, and assessments (idempotent; safe to re-run)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dev-login",
            action="store_true",
            help=(
                "If no Django superuser exists yet, create one for local REQUIRE_AUTH=1: "
                f"username {DEV_SUPERUSER_USERNAME!r} (password printed once; also in README). "
                "Sign in via the SPA at http://localhost:5173/ — no extra terminal step after this."
            ),
        )

    def handle(self, *args, **options):
        created_emp = created_skill = created_a = 0
        skipped_emp = skipped_skill = skipped_a = 0

        for name in EMPLOYEE_NAMES:
            _obj, created = Employee.objects.get_or_create(name=name)
            if created:
                created_emp += 1
            else:
                skipped_emp += 1

        for name in SKILL_NAMES:
            _obj, created = Skill.objects.get_or_create(name=name)
            if created:
                created_skill += 1
            else:
                skipped_skill += 1

        emp_by = {e.name: e for e in Employee.objects.filter(name__in=EMPLOYEE_NAMES)}
        skill_by = {s.name: s for s in Skill.objects.filter(name__in=SKILL_NAMES)}

        for ename, sname, score, d in SEED_ASSESSMENTS:
            emp = emp_by[ename]
            sk = skill_by[sname]
            _a, created = Assessment.objects.get_or_create(
                employee=emp,
                skill=sk,
                date=d,
                defaults={"score": score},
            )
            if created:
                created_a += 1
            else:
                skipped_a += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo seed done. Employees +{created_emp} / skipped {skipped_emp}; "
                f"Skills +{created_skill} / skipped {skipped_skill}; "
                f"Assessments +{created_a} / skipped {skipped_a}."
            )
        )
        self.stdout.write(
            "GraphQL: http://127.0.0.1:8000/graphql/  |  "
            "Open the SPA and check the matrix (Ada/GraphQL avg 2.5; Bob/Safety avg 2.0)."
        )

        if options["dev_login"]:
            User = get_user_model()
            if User.objects.filter(is_superuser=True).exists():
                self.stdout.write(
                    "Dev login: a superuser already exists; skipped creating "
                    f"{DEV_SUPERUSER_USERNAME!r}."
                )
            else:
                User.objects.create_superuser(
                    DEV_SUPERUSER_USERNAME,
                    DEV_SUPERUSER_EMAIL,
                    DEV_SUPERUSER_PASSWORD,
                )
                self.stdout.write(
                    self.style.WARNING(
                        f"Dev login: created superuser {DEV_SUPERUSER_USERNAME!r}. "
                        f"Use this password in the SPA sign-in form: {DEV_SUPERUSER_PASSWORD!r}"
                    )
                )
                self.stdout.write(
                    "Do not use --dev-login or this account in production; rotate if this DB is shared."
                )
