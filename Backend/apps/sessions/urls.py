from django.urls import path
from .views import (
    MarkAnalysisCompletedView,
    AuraSessionListView,
    AuraSessionDetailView,
    GenerateSessionLinkView,
    PublicSlotsView,
    PublicSessionValidateView,
    PublicBookSlotView,
)

urlpatterns = [
    # SuperAdmin
    path('analysis-completed/',         MarkAnalysisCompletedView.as_view(), name='session-analysis-completed'),
    path('',                             AuraSessionListView.as_view(),       name='session-list'),
    path('<uuid:pk>/',                   AuraSessionDetailView.as_view(),     name='session-detail'),
    path('<uuid:pk>/generate-link/',     GenerateSessionLinkView.as_view(),   name='session-generate-link'),

    # Public (no auth)
    path('public/<str:token>/slots/', PublicSlotsView.as_view(),           name='session-public-slots'),
    path('public/<str:token>/',       PublicSessionValidateView.as_view(), name='session-public-validate'),
    path('public/<str:token>/book/',  PublicBookSlotView.as_view(),        name='session-public-book'),
]
