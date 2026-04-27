"""
URL Configuration for Astrology Scheduling
"""
from django.urls import path
from .views import AvailabilityView, SlotsView, ScheduleView, ScheduleDetailView

urlpatterns = [
    path('availability/',       AvailabilityView.as_view(),    name='astrology-availability'),
    path('slots/',              SlotsView.as_view(),           name='astrology-slots'),
    path('schedule/',           ScheduleView.as_view(),        name='astrology-schedule'),
    path('schedule/<str:pk>/',  ScheduleDetailView.as_view(),  name='astrology-schedule-detail'),
]
