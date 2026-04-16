"""
Blog Serializers
"""
from rest_framework import serializers
from .models import Blog, BlogImage
from apps.accounts.models import User


class BlogImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogImage
        fields = ['id', 'image', 'caption', 'order']


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'avatar']


class BlogListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing/cards."""
    author = AuthorSerializer(read_only=True)
    poster_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'description',
            'poster_image_url', 'author', 'status',
            'created_at', 'published_at',
        ]

    def get_poster_image_url(self, obj):
        if obj.poster_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.poster_image.url)
            return obj.poster_image.url
        return None


class BlogDetailSerializer(serializers.ModelSerializer):
    """Full serializer for blog detail page."""
    author = AuthorSerializer(read_only=True)
    gallery_images = BlogImageSerializer(many=True, read_only=True)
    poster_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'description', 'content',
            'poster_image_url', 'poster_image_alt', 'gallery_images', 'author',
            'status', 'meta_title', 'meta_description',
            'created_at', 'updated_at', 'published_at',
        ]

    def get_poster_image_url(self, obj):
        if obj.poster_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.poster_image.url)
            return obj.poster_image.url
        return None


class BlogWriteSerializer(serializers.ModelSerializer):
    """Used for create / update — accepts multipart (includes image upload)."""

    class Meta:
        model = Blog
        fields = [
            'title', 'description', 'content',
            'poster_image', 'poster_image_alt', 'status',
            'meta_title', 'meta_description',
        ]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be blank.')
        return value.strip()

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError('Description cannot be blank.')
        return value.strip()


class AssignBlogRoleSerializer(serializers.Serializer):
    """SuperAdmin assigns/revokes blog-manager permission for a user."""
    user_id = serializers.CharField()
    can_manage = serializers.BooleanField()

    def validate_user_id(self, value):
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')
        return value
