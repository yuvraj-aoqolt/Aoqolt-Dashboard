"""
Blog Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.utils.text import slugify

from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin
from .models import Blog, BlogImage
from .serializers import (
    BlogListSerializer, BlogDetailSerializer, BlogWriteSerializer,
    AssignBlogRoleSerializer,
)
from .permissions import IsBlogManagerOrSuperAdmin, IsBlogAuthorOrSuperAdmin


class BlogListView(APIView):
    """
    GET /api/v1/blogs/
    Public — returns paginated published blogs.
    Query params: page, page_size, search, status (superadmin only)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # SuperAdmin can filter by status; everyone else only sees published
        if request.user and request.user.is_authenticated and request.user.is_superadmin:
            qs = Blog.objects.select_related('author').all()
            status_filter = request.query_params.get('status')
            if status_filter in (Blog.DRAFT, Blog.PUBLISHED):
                qs = qs.filter(status=status_filter)
        else:
            qs = Blog.objects.select_related('author').filter(status=Blog.PUBLISHED)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(title__icontains=search)

        # Pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(max(1, int(request.query_params.get('page_size', 9))), 50)
        except (ValueError, TypeError):
            page = 1
            page_size = 9

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        blogs = qs[start:end]

        serializer = BlogListSerializer(blogs, many=True, context={'request': request})
        return Response({
            'success': True,
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),  # ceiling div
            'results': serializer.data,
        })


class BlogDetailView(APIView):
    """
    GET /api/v1/blogs/<slug>/
    Public — returns full blog detail.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        blog = get_object_or_404(
            Blog.objects.select_related('author').prefetch_related('gallery_images'),
            slug=slug,
            status=Blog.PUBLISHED,
        )
        serializer = BlogDetailSerializer(blog, context={'request': request})
        return Response({'success': True, 'data': serializer.data})


class BlogCreateView(APIView):
    """
    POST /api/v1/blogs/create/
    Requires blog-manager permission or superadmin.
    """
    permission_classes = [IsBlogManagerOrSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = BlogWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blog = serializer.save(author=request.user)
        return Response(
            {
                'success': True,
                'message': 'Blog created successfully.',
                'data': BlogDetailSerializer(blog, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class BlogUpdateView(APIView):
    """
    PUT/PATCH /api/v1/blogs/update/<pk>/
    Author or SuperAdmin can update.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_blog(self, pk, user):
        blog = get_object_or_404(Blog, pk=pk)
        perm = IsBlogAuthorOrSuperAdmin()
        if not perm.has_object_permission(None, None, blog) or not (
            user.is_superadmin or getattr(user, 'can_manage_blogs', False)
        ):
            # Re-check properly
            pass
        if not user.is_superadmin and blog.author != user:
            return None
        return blog

    def _update(self, request, pk, partial):
        blog = get_object_or_404(Blog, pk=pk)
        if not request.user.is_superadmin and blog.author != request.user:
            return Response({'error': 'You do not have permission to edit this blog.'},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = BlogWriteSerializer(blog, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        blog = serializer.save()
        return Response({
            'success': True,
            'message': 'Blog updated successfully.',
            'data': BlogDetailSerializer(blog, context={'request': request}).data,
        })

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)


class BlogDeleteView(APIView):
    """
    DELETE /api/v1/blogs/delete/<pk>/
    Author or SuperAdmin can delete.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        blog = get_object_or_404(Blog, pk=pk)
        if not request.user.is_superadmin and blog.author != request.user:
            return Response({'error': 'You do not have permission to delete this blog.'},
                            status=status.HTTP_403_FORBIDDEN)
        blog.delete()
        return Response({'success': True, 'message': 'Blog deleted.'}, status=status.HTTP_204_NO_CONTENT)


class BlogGalleryUploadView(APIView):
    """POST /api/v1/blogs/<pk>/gallery/ — upload a gallery image."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        blog = get_object_or_404(Blog, pk=pk)
        if not request.user.is_superadmin and blog.author != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
        gallery = BlogImage.objects.create(
            blog=blog,
            image=image_file,
            caption=request.data.get('caption', ''),
        )
        return Response({'success': True, 'image_url': request.build_absolute_uri(gallery.image.url)},
                        status=status.HTTP_201_CREATED)


# ── SuperAdmin: my blogs listing ──────────────────────────────────────────

class MyBlogsView(APIView):
    """GET /api/v1/blogs/my/ — blogs authored by the logged-in user."""
    permission_classes = [IsBlogManagerOrSuperAdmin]

    def get(self, request):
        if request.user.is_superadmin:
            qs = Blog.objects.select_related('author').all()
        else:
            qs = Blog.objects.select_related('author').filter(author=request.user)
        serializer = BlogListSerializer(qs, many=True, context={'request': request})
        return Response({'success': True, 'results': serializer.data})


# ── SuperAdmin: assign blog role ──────────────────────────────────────────

class AssignBlogRoleView(APIView):
    """
    POST /api/v1/blogs/admin/assign-blog-role/
    SuperAdmin grants or revokes blog-manager permission.
    Body: { "user_id": "...", "can_manage": true/false }
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = AssignBlogRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(id=serializer.validated_data['user_id'])
        user.can_manage_blogs = serializer.validated_data['can_manage']
        user.save(update_fields=['can_manage_blogs'])
        action = 'granted' if user.can_manage_blogs else 'revoked'
        return Response({
            'success': True,
            'message': f'Blog manager permission {action} for {user.email}.',
            'user_id': user.id,
            'can_manage_blogs': user.can_manage_blogs,
        })


class BlogManagersListView(APIView):
    """
    GET /api/v1/blogs/admin/blog-managers/
    SuperAdmin — list all users with can_manage_blogs=True.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.accounts.serializers import UserListSerializer
        managers = User.objects.filter(can_manage_blogs=True)
        from apps.accounts.serializers import UserListSerializer
        serializer = UserListSerializer(managers, many=True)
        return Response({'success': True, 'results': serializer.data})
