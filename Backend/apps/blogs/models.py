"""
Blog Models
"""
from django.db import models
from django.utils.text import slugify
from django.utils import timezone
from apps.accounts.models import User
import uuid


def blog_poster_upload(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f"blog_posters/{instance.id}.{ext}"


def blog_gallery_upload(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f"blog_gallery/{uuid.uuid4().hex}.{ext}"


class Blog(models.Model):
    DRAFT = 'draft'
    PUBLISHED = 'published'

    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (PUBLISHED, 'Published'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True, db_index=True)
    description = models.CharField(max_length=500, help_text='Short preview text shown on cards')
    content = models.TextField(help_text='Full rich-text / HTML content')
    poster_image = models.ImageField(upload_to=blog_poster_upload, blank=True, null=True)
    poster_image_alt = models.CharField(max_length=255, blank=True, help_text='Alt text for the poster image (SEO)')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=DRAFT, db_index=True)

    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='blogs'
    )

    # SEO
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'blogs'
        verbose_name = 'Blog'
        verbose_name_plural = 'Blogs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.title

    def _make_unique_slug(self, base):
        slug = base
        counter = 1
        while Blog.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._make_unique_slug(slugify(self.title))
        if self.status == self.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class BlogImage(models.Model):
    """Optional gallery images attached to a blog post."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='gallery_images')
    image = models.ImageField(upload_to=blog_gallery_upload)
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blog_images'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Image for '{self.blog.title}'"
