from django.core.exceptions import ValidationError
from django.db import models


def validate_score(value: int) -> None:
    if value < 1 or value > 5:
        raise ValidationError("Score must be between 1 and 5.")


class Employee(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Skill(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Assessment(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="assessments"
    )
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="assessments")
    score = models.PositiveSmallIntegerField(validators=[validate_score])
    date = models.DateField()

    class Meta:
        ordering = ["-date", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(score__gte=1) & models.Q(score__lte=5),
                name="assessment_score_between_1_and_5",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.employee} / {self.skill}: {self.score} @ {self.date}"
