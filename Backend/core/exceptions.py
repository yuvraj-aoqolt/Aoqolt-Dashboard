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
                custom_response_data['error']['message'] = str(response.data['detail'])
            elif 'non_field_errors' in response.data:
                custom_response_data['error']['message'] = str(response.data['non_field_errors'][0])
                custom_response_data['error']['details'] = response.data
            else:
                # Extract first human-readable message as the top-level message
                first_msg = ''
                for v in response.data.values():
                    if isinstance(v, list) and v:
                        first_msg = str(v[0])
                    elif isinstance(v, str):
                        first_msg = v
                    if first_msg:
                        break
                custom_response_data['error']['message'] = first_msg or 'An error occurred'
                custom_response_data['error']['details'] = response.data
        else:
            custom_response_data['error']['message'] = str(response.data)
        
        response.data = custom_response_data
    
    return response
