import graphene
from django.core.exceptions import ValidationError
from django.db.models import Avg, Count
from django.utils import timezone
from graphene_django import DjangoObjectType

from .models import Assessment, Employee, Skill


class EmployeeType(DjangoObjectType):
    class Meta:
        model = Employee
        fields = ("id", "name")


class SkillType(DjangoObjectType):
    class Meta:
        model = Skill
        fields = ("id", "name")


class AssessmentType(DjangoObjectType):
    class Meta:
        model = Assessment
        fields = ("id", "employee", "skill", "score", "date", "notes")


class AllDataType(graphene.ObjectType):
    employees = graphene.List(graphene.NonNull(EmployeeType), required=True)
    skills = graphene.List(graphene.NonNull(SkillType), required=True)


class MatrixCellType(graphene.ObjectType):
    employee_id = graphene.Int(required=True)
    skill_id = graphene.Int(required=True)
    average = graphene.Float(required=True)
    count = graphene.Int(required=True)


class AssessmentsOrder(graphene.Enum):
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"


class AssessmentsPageType(graphene.ObjectType):
    items = graphene.List(graphene.NonNull(AssessmentType), required=True)
    total_count = graphene.Int(required=True)


def _active_assessments():
    return Assessment.objects.filter(deleted_at__isnull=True)


class Query(graphene.ObjectType):
    all_data = graphene.Field(AllDataType, required=True)
    matrix_cells = graphene.List(graphene.NonNull(MatrixCellType), required=True)
    assessments = graphene.Field(
        AssessmentsPageType,
        required=True,
        limit=graphene.Int(default_value=25),
        offset=graphene.Int(default_value=0),
        order=AssessmentsOrder(default_value=AssessmentsOrder.DATE_DESC),
        employee_id=graphene.Int(),
        skill_id=graphene.Int(),
        score_lt=graphene.Int(),
    )

    def resolve_all_data(self, info):
        return AllDataType(
            employees=Employee.objects.all(),
            skills=Skill.objects.all(),
        )

    def resolve_matrix_cells(self, info):
        rows = (
            _active_assessments()
            .values("employee_id", "skill_id")
            .annotate(avg_score=Avg("score"), cnt=Count("id"))
        )
        return [
            MatrixCellType(
                employee_id=r["employee_id"],
                skill_id=r["skill_id"],
                average=float(r["avg_score"]),
                count=r["cnt"],
            )
            for r in rows
        ]

    def resolve_assessments(
        self,
        info,
        limit: int = 25,
        offset: int = 0,
        order=AssessmentsOrder.DATE_DESC,
        employee_id: int | None = None,
        skill_id: int | None = None,
        score_lt: int | None = None,
    ):
        qs = _active_assessments().select_related("employee", "skill")
        if employee_id is not None:
            qs = qs.filter(employee_id=employee_id)
        if skill_id is not None:
            qs = qs.filter(skill_id=skill_id)
        if score_lt is not None:
            qs = qs.filter(score__lt=score_lt)
        if order == AssessmentsOrder.DATE_ASC:
            qs = qs.order_by("date", "id")
        else:
            qs = qs.order_by("-date", "-id")
        total = qs.count()
        items = list(qs[offset : offset + max(0, limit)])
        return AssessmentsPageType(items=items, total_count=total)


class AddAssessment(graphene.Mutation):
    class Arguments:
        employee_id = graphene.Int(required=True)
        skill_id = graphene.Int(required=True)
        score = graphene.Int(required=True)
        date = graphene.Date(required=True)
        notes = graphene.String()

    assessment = graphene.Field(AssessmentType)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, employee_id: int, skill_id: int, score: int, date, notes: str | None = None):
        try:
            employee = Employee.objects.get(pk=employee_id)
            skill = Skill.objects.get(pk=skill_id)
        except (Employee.DoesNotExist, Skill.DoesNotExist):
            return AddAssessment(ok=False, assessment=None, error="Employee or skill not found.")

        clean_notes = (notes or "").strip()
        assessment = Assessment(
            employee=employee,
            skill=skill,
            score=score,
            date=date,
            notes=clean_notes,
        )
        try:
            assessment.full_clean()
            assessment.save()
        except ValidationError as e:
            return AddAssessment(ok=False, assessment=None, error="; ".join(e.messages))

        return AddAssessment(ok=True, assessment=assessment, error=None)


class UpdateAssessment(graphene.Mutation):
    class Arguments:
        assessment_id = graphene.Int(required=True)
        score = graphene.Int(required=True)
        date = graphene.Date(required=True)
        notes = graphene.String()

    assessment = graphene.Field(AssessmentType)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(
        self,
        info,
        assessment_id: int,
        score: int,
        date,
        notes: str | None = None,
    ):
        a = Assessment.objects.filter(pk=assessment_id).first()
        if a is None:
            return UpdateAssessment(ok=False, assessment=None, error="Assessment not found.")
        if a.deleted_at is not None:
            return UpdateAssessment(ok=False, assessment=None, error="Assessment is deleted.")

        a.score = score
        a.date = date
        a.notes = (notes or "").strip()
        try:
            a.full_clean()
            a.save()
        except ValidationError as e:
            return UpdateAssessment(ok=False, assessment=None, error="; ".join(e.messages))

        return UpdateAssessment(ok=True, assessment=a, error=None)


class AddEmployee(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)

    employee = graphene.Field(EmployeeType)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, name: str):
        clean = (name or "").strip()
        if not clean:
            return AddEmployee(ok=False, employee=None, error="Name is required.")
        clean = clean[: Employee._meta.get_field("name").max_length]
        employee = Employee.objects.create(name=clean)
        return AddEmployee(ok=True, employee=employee, error=None)


class AddSkill(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)

    skill = graphene.Field(SkillType)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, name: str):
        clean = (name or "").strip()
        if not clean:
            return AddSkill(ok=False, skill=None, error="Name is required.")
        clean = clean[: Skill._meta.get_field("name").max_length]
        skill = Skill.objects.create(name=clean)
        return AddSkill(ok=True, skill=skill, error=None)


class DeleteAssessment(graphene.Mutation):
    class Arguments:
        assessment_id = graphene.Int(required=True)

    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, assessment_id: int):
        a = Assessment.objects.filter(pk=assessment_id).first()
        if a is None:
            return DeleteAssessment(ok=False, error="Assessment not found.")
        if a.deleted_at is not None:
            return DeleteAssessment(ok=True, error=None)
        a.deleted_at = timezone.now()
        a.save(update_fields=["deleted_at"])
        return DeleteAssessment(ok=True, error=None)


class RestoreAssessment(graphene.Mutation):
    class Arguments:
        assessment_id = graphene.Int(required=True)

    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, assessment_id: int):
        a = Assessment.objects.filter(pk=assessment_id).first()
        if a is None:
            return RestoreAssessment(ok=False, error="Assessment not found.")
        if a.deleted_at is None:
            return RestoreAssessment(ok=False, error="Assessment is not pending removal.")
        a.deleted_at = None
        a.save(update_fields=["deleted_at"])
        return RestoreAssessment(ok=True, error=None)


class FinalizeDeleteAssessment(graphene.Mutation):
    class Arguments:
        assessment_id = graphene.Int(required=True)

    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, assessment_id: int):
        deleted, _ = Assessment.objects.filter(pk=assessment_id).exclude(deleted_at=None).delete()
        if deleted == 0:
            return FinalizeDeleteAssessment(
                ok=False,
                error="Assessment not found or not pending removal.",
            )
        return FinalizeDeleteAssessment(ok=True, error=None)


class BulkImportRowInput(graphene.InputObjectType):
    employee_id = graphene.Int(required=True)
    skill_id = graphene.Int(required=True)
    score = graphene.Int(required=True)
    date = graphene.Date(required=True)
    notes = graphene.String()


class BulkImportAssessments(graphene.Mutation):
    """Insert many assessments from parsed rows (strict: employee and skill must exist by id)."""

    class Arguments:
        rows = graphene.List(graphene.NonNull(BulkImportRowInput), required=True)

    created_count = graphene.Int(required=True)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, rows):
        if not rows:
            return BulkImportAssessments(ok=True, created_count=0, error=None)
        created = 0
        for row in rows:
            eid = row.employee_id
            sid = row.skill_id
            sc = row.score
            d = row.date
            notes = (getattr(row, "notes", None) or "").strip()
            try:
                emp = Employee.objects.get(pk=eid)
                sk = Skill.objects.get(pk=sid)
            except (Employee.DoesNotExist, Skill.DoesNotExist):
                return BulkImportAssessments(
                    ok=False,
                    created_count=created,
                    error=f"Unknown employee_id={eid} or skill_id={sid}.",
                )
            a = Assessment(
                employee=emp,
                skill=sk,
                score=sc,
                date=d,
                notes=notes,
            )
            try:
                a.full_clean()
                a.save()
            except ValidationError as e:
                return BulkImportAssessments(
                    ok=False,
                    created_count=created,
                    error="; ".join(e.messages),
                )
            created += 1
        return BulkImportAssessments(ok=True, created_count=created, error=None)


class Mutation(graphene.ObjectType):
    add_assessment = AddAssessment.Field()
    update_assessment = UpdateAssessment.Field()
    add_employee = AddEmployee.Field()
    add_skill = AddSkill.Field()
    delete_assessment = DeleteAssessment.Field()
    restore_assessment = RestoreAssessment.Field()
    finalize_delete_assessment = FinalizeDeleteAssessment.Field()
    bulk_import_assessments = BulkImportAssessments.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
