"""
Custom exception handler for REST API
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error responses
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'message': '',
                'details': {}
            }
        }
        
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['error']['message'] = response.data['detail']
            else:
                custom_response_data['error']['message'] = 'An error occurred'
                custom_response_data['error']['details'] = response.data
        else:
            custom_response_data['error']['message'] = str(response.data)
        
        response.data = custom_response_data
    
    return response
