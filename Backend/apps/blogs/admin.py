"""
Admin for Blogs app
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Blog, BlogImage


class BlogImageInline(admin.TabularInline):
    model = BlogImage
    extra = 0
    readonly_fields = ['created_at']
    fields = ['image', 'caption', 'order', 'created_at']


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'poster_thumb', 'created_at', 'published_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'author__email', 'author__full_name']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['id', 'created_at', 'updated_at', 'published_at']
    ordering = ['-created_at']
    inlines = [BlogImageInline]

    fieldsets = (
        ('Content', {'fields': ('title', 'slug', 'description', 'content', 'poster_image')}),
        ('Publishing', {'fields': ('status', 'author')}),
        ('SEO', {'fields': ('meta_title', 'meta_description'), 'classes': ('collapse',)}),
        ('Metadata', {'fields': ('id', 'created_at', 'updated_at', 'published_at'), 'classes': ('collapse',)}),
    )

    def poster_thumb(self, obj):
        if obj.poster_image:
            return format_html('<img src="{}" style="height:40px;border-radius:4px;">', obj.poster_image.url)
        return '—'
    poster_thumb.short_description = 'Poster'
