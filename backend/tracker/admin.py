from django.contrib import admin

from .models import Assessment, Employee, Skill


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "skill", "score", "date", "notes", "deleted_at")
    list_filter = ("date", "skill")
    autocomplete_fields = ("employee", "skill")
