"""
Case Management Models
"""
from django.db import models
from apps.accounts.models import User
from apps.bookings.models import Booking
import uuid


class Case(models.Model):
    """
    Case model representing the lifecycle of a booking
    Status flow: RECEIVED → WORKING → COMPLETED
    """
    STATUS_RECEIVED = 'received'
    STATUS_WORKING = 'working'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = [
        (STATUS_RECEIVED, 'Received'),
        (STATUS_WORKING, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # Relations
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='case')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cases_as_client')
    assigned_admin = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='cases_as_admin',
        limit_choices_to={'role': 'admin'}
    )
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_RECEIVED)
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ],
        default='medium'
    )
    
    # Timeline
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Expected completion
    expected_completion_date = models.DateField(null=True, blank=True)
    
    # Notes
    admin_notes = models.TextField(blank=True, help_text="Internal notes for admin/superadmin")
    
    class Meta:
        db_table = 'cases'
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case_number']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['assigned_admin', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"Case {self.case_number} - {self.client.email}"
    
    def save(self, *args, **kwargs):
        """Generate case number on creation"""
        if not self.case_number:
            import datetime
            # Format: CASE-YYYYMMDD-XXXX
            today = datetime.date.today().strftime('%Y%m%d')
            last_case = Case.objects.filter(case_number__startswith=f'CASE-{today}').order_by('-case_number').first()
            
            if last_case:
                last_num = int(last_case.case_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.case_number = f'CASE-{today}-{new_num:04d}'
        
        super().save(*args, **kwargs)


class CaseAssignment(models.Model):
    """
    Track case assignment history
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='assignment_history')
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='case_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assignments_made')
    
    notes = models.TextField(blank=True)
    
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'case_assignments'
        verbose_name = 'Case Assignment'
        verbose_name_plural = 'Case Assignments'
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.case.case_number} assigned to {self.admin.full_name}"


class CaseResult(models.Model):
    """
    Final result uploaded by admin
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.OneToOneField(Case, on_delete=models.CASCADE, related_name='result')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    # Result content
    result_text = models.TextField(blank=True)
    result_file = models.FileField(upload_to='case_results/%Y/%m/%d/', null=True, blank=True)
    
    # Additional files
    additional_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Client feedback
    client_viewed = models.BooleanField(default=False)
    client_viewed_at = models.DateTimeField(null=True, blank=True)
    client_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5")
    client_feedback = models.TextField(blank=True)
    
    class Meta:
        db_table = 'case_results'
        verbose_name = 'Case Result'
        verbose_name_plural = 'Case Results'
    
    def __str__(self):
        return f"Result for {self.case.case_number}"


class CaseResultAttachment(models.Model):
    """
    Additional files attached to case result
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_result = models.ForeignKey(CaseResult, on_delete=models.CASCADE, related_name='attachments')
    
    file = models.FileField(upload_to='case_result_attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.IntegerField()
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'case_result_attachments'
        verbose_name = 'Case Result Attachment'
        verbose_name_plural = 'Case Result Attachments'
    
    def __str__(self):
        return f"{self.file_name} - {self.case_result.case.case_number}"


class CaseStatusHistory(models.Model):
    """
    Track status changes for audit trail
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='status_history')
    
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'case_status_history'
        verbose_name = 'Case Status History'
        verbose_name_plural = 'Case Status Histories'
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.case.case_number}: {self.from_status} → {self.to_status}"
