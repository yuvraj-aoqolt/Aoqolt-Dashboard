"""
ASGI config for core project.
Exposes the ASGI callable as a module-level variable named ``application``.
Includes WebSocket support via Django Channels.
"""

import os
from django.core.asgi import get_asgi_application

# Initialize Django FIRST before any other imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

# NOW import Channels and app-specific modules (after Django is initialized)
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async


class TokenAuthMiddleware:
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens
    Token can be passed as query parameter: ws://.../?token=<jwt_token>
    """
    
    def __init__(self, inner):
        self.inner = inner
    
    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        # Authenticate user
        scope['user'] = await self.get_user_from_token(token)
        
        return await self.inner(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Validate JWT token and return user"""
        if not token:
            return AnonymousUser()
        
        try:
            # Import here to avoid circular imports
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.accounts.models import User
            
            # Validate token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Get user
            user = User.objects.get(id=user_id)
            return user
        except Exception:
            return AnonymousUser()


def TokenAuthMiddlewareStack(inner):
    """Wrap with token auth middleware"""
    return TokenAuthMiddleware(inner)


# Import routing patterns after Django initialization
from apps.chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from apps.notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns


# ASGI application with WebSocket support
application = ProtocolTypeRouter({
    # HTTP requests
    "http": django_asgi_app,
    
    # WebSocket connections
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(
                chat_websocket_urlpatterns + notification_websocket_urlpatterns
            )
        )
    ),
})
