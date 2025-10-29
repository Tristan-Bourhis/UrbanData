from flask import jsonify
from flask_wtf.csrf import generate_csrf

def get_csrf_token():
    return jsonify({"csrf_token": generate_csrf()})