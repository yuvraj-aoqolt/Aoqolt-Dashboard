"""
Admin configuration for Cases app
"""
from django.contrib import admin
from .models import Case, CaseAssignment, CaseResult, CaseResultAttachment, CaseStatusHistory


class CaseStatusHistoryInline(admin.TabularInline):
    model = CaseStatusHistory
    extra = 0
    readonly_fields = ['changed_at']


class CaseAssignmentInline(admin.TabularInline):
    model = CaseAssignment
    extra = 0
    readonly_fields = ['assigned_at']


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['case_number', 'client', 'assigned_admin', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'created_at', 'assigned_admin']
    search_fields = ['case_number', 'client__email', 'client__full_name']
    readonly_fields = ['id', 'case_number', 'created_at', 'updated_at', 'assigned_at', 'started_at', 'completed_at']
    inlines = [CaseAssignmentInline, CaseStatusHistoryInline]
    
    fieldsets = (
        ('Case Information', {
            'fields': ('id', 'case_number', 'booking', 'client')
        }),
        ('Assignment', {
            'fields': ('assigned_admin', 'assigned_at')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'expected_completion_date')
        }),
        ('Timeline', {
            'fields': ('created_at', 'started_at', 'completed_at', 'updated_at')
        }),
        ('Notes', {
            'fields': ('admin_notes',)
        }),
    )


@admin.register(CaseResult)
class CaseResultAdmin(admin.ModelAdmin):
    list_display = ['case', 'uploaded_by', 'client_viewed', 'client_rating', 'created_at']
    list_filter = ['client_viewed', 'created_at']
    search_fields = ['case__case_number', 'case__client__email']
    readonly_fields = ['created_at', 'updated_at', 'client_viewed_at']


@admin.register(CaseAssignment)
class CaseAssignmentAdmin(admin.ModelAdmin):
    list_display = ['case', 'admin', 'assigned_by', 'is_active', 'assigned_at']
    list_filter = ['is_active', 'assigned_at']
    search_fields = ['case__case_number', 'admin__email']
    readonly_fields = ['assigned_at', 'unassigned_at']
