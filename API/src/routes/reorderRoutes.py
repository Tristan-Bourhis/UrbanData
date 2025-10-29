from flask import Blueprint, request, jsonify
from controllers.HelloWorldController import HelloWorldRoute
from controllers.CsrfController import get_csrf_token
from extension import limiter

reorderBlueprint = Blueprint('reorder', __name__)

@reorderBlueprint.route('/', methods=['GET'])
@limiter.limit("5 per minute")
def hello_world():
    return HelloWorldRoute()

@reorderBlueprint.route('/get-token', methods=['GET'])
@limiter.limit("2 per day")
def get_token():
    return get_csrf_token()