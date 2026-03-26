"""
Initial migration for blogs app.
Creates Blog and BlogImage tables.
"""
import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
import apps.blogs.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Blog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('slug', models.SlugField(blank=True, db_index=True, max_length=280, unique=True)),
                ('description', models.CharField(help_text='Short preview text shown on cards', max_length=500)),
                ('content', models.TextField(help_text='Full rich-text / HTML content')),
                ('poster_image', models.ImageField(blank=True, null=True, upload_to=apps.blogs.models.blog_poster_upload)),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('published', 'Published')],
                    db_index=True,
                    default='draft',
                    max_length=10,
                )),
                ('meta_title', models.CharField(blank=True, max_length=255)),
                ('meta_description', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('author', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='blogs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Blog',
                'verbose_name_plural': 'Blogs',
                'db_table': 'blogs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='blog',
            index=models.Index(fields=['status', '-created_at'], name='blog_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='blog',
            index=models.Index(fields=['slug'], name='blog_slug_idx'),
        ),
        migrations.CreateModel(
            name='BlogImage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('image', models.ImageField(upload_to=apps.blogs.models.blog_gallery_upload)),
                ('caption', models.CharField(blank=True, max_length=255)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('blog', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='gallery_images',
                    to='blogs.blog',
                )),
            ],
            options={
                'verbose_name': 'Blog Image',
                'db_table': 'blog_images',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
