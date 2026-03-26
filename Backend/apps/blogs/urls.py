"""
URL Configuration for Blogs app
"""
from django.urls import path
from .views import (
    BlogListView, BlogDetailView,
    BlogCreateView, BlogUpdateView, BlogDeleteView,
    BlogGalleryUploadView, MyBlogsView,
    AssignBlogRoleView, BlogManagersListView,
)

urlpatterns = [
    # Public list
    path('', BlogListView.as_view(), name='blog-list'),

    # Authenticated blog managers / superadmin — must come BEFORE <slug> catch-all
    path('create/', BlogCreateView.as_view(), name='blog-create'),
    path('update/<uuid:pk>/', BlogUpdateView.as_view(), name='blog-update'),
    path('delete/<uuid:pk>/', BlogDeleteView.as_view(), name='blog-delete'),
    path('my/', MyBlogsView.as_view(), name='blog-my'),

    # SuperAdmin management
    path('admin/assign-blog-role/', AssignBlogRoleView.as_view(), name='blog-assign-role'),
    path('admin/blog-managers/', BlogManagersListView.as_view(), name='blog-managers'),

    # Gallery upload (uuid, so no conflict with slug)
    path('<uuid:pk>/gallery/', BlogGalleryUploadView.as_view(), name='blog-gallery'),

    # Public detail — slug catch-all LAST
    path('<slug:slug>/', BlogDetailView.as_view(), name='blog-detail'),
]
