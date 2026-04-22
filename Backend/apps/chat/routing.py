"""
WebSocket URL Configuration for Chat
"""
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/chat/<str:room_type>/<uuid:room_id>/', consumers.ChatConsumer.as_asgi()),
]
