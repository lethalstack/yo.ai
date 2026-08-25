import sys
import os
from io import BytesIO

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app


def handler(request):
    """Vercel serverless handler that converts Vercel request to Flask WSGI"""
    
    # Build WSGI environ from Vercel request
    environ = {
        'REQUEST_METHOD': request.method,
        'SCRIPT_NAME': '',
        'PATH_INFO': request.path or '/',
        'QUERY_STRING': request.query_string or '',
        'CONTENT_TYPE': request.headers.get('content-type', ''),
        'CONTENT_LENGTH': request.headers.get('content-length', ''),
        'SERVER_NAME': request.headers.get('host', 'localhost'),
        'SERVER_PORT': '443',
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': 'https',
        'wsgi.input': BytesIO(request.body) if isinstance(request.body, bytes) else BytesIO(),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': True,
    }
    
    # Add all headers to environ
    for header, value in request.headers.items():
        header = header.upper().replace('-', '_')
        if header not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            environ[f'HTTP_{header}'] = value
    
    # Capture response
    response_started = False
    status = None
    response_headers = []
    
    def start_response(status_str, headers):
        nonlocal response_started, status, response_headers
        response_started = True
        status = int(status_str.split()[0])
        response_headers = headers
        return lambda s: None
    
    try:
        # Call Flask app via WSGI
        response_body = app(environ, start_response)
        
        # Collect response
        body = b''
        for data in response_body:
            if isinstance(data, str):
                body += data.encode('utf-8')
            else:
                body += data
        
        return {
            'statusCode': status or 200,
            'headers': dict(response_headers),
            'body': body.decode('utf-8', errors='ignore') if isinstance(body, bytes) else body,
            'isBase64Encoded': False,
        }
    
    except Exception as e:
        print(f"Handler error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': f'Internal Server Error: {str(e)}',
        }