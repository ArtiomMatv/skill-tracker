import graphene
from django.core.exceptions import ValidationError
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
        fields = ("id", "employee", "skill", "score", "date")


class AllDataType(graphene.ObjectType):
    employees = graphene.List(graphene.NonNull(EmployeeType), required=True)
    skills = graphene.List(graphene.NonNull(SkillType), required=True)
    assessments = graphene.List(graphene.NonNull(AssessmentType), required=True)


class Query(graphene.ObjectType):
    all_data = graphene.Field(AllDataType, required=True)

    def resolve_all_data(self, info):
        return AllDataType(
            employees=Employee.objects.all(),
            skills=Skill.objects.all(),
            assessments=Assessment.objects.select_related("employee", "skill").all(),
        )


class AddAssessment(graphene.Mutation):
    class Arguments:
        employee_id = graphene.Int(required=True)
        skill_id = graphene.Int(required=True)
        score = graphene.Int(required=True)
        date = graphene.Date(required=True)

    assessment = graphene.Field(AssessmentType)
    ok = graphene.Boolean(required=True)
    error = graphene.String()

    def mutate(self, info, employee_id: int, skill_id: int, score: int, date):
        try:
            employee = Employee.objects.get(pk=employee_id)
            skill = Skill.objects.get(pk=skill_id)
        except (Employee.DoesNotExist, Skill.DoesNotExist):
            return AddAssessment(ok=False, assessment=None, error="Employee or skill not found.")

        assessment = Assessment(employee=employee, skill=skill, score=score, date=date)
        try:
            assessment.full_clean()
            assessment.save()
        except ValidationError as e:
            return AddAssessment(ok=False, assessment=None, error="; ".join(e.messages))

        return AddAssessment(ok=True, assessment=assessment, error=None)


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
        deleted, _ = Assessment.objects.filter(pk=assessment_id).delete()
        if deleted == 0:
            return DeleteAssessment(ok=False, error="Assessment not found.")
        return DeleteAssessment(ok=True, error=None)


class Mutation(graphene.ObjectType):
    add_assessment = AddAssessment.Field()
    add_employee = AddEmployee.Field()
    add_skill = AddSkill.Field()
    delete_assessment = DeleteAssessment.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
