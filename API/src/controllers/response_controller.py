from flask import request

def set_response_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = ['http://localhost:8501', 'https://127.0.0.1:5000']

    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin

    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, X-API-KEY'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    return response