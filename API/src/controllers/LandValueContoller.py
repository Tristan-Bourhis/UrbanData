from flask import jsonify
from models.LandValueModel import getLandValueModel
from controllers.response_controller import set_response_headers

def getLandValueModelController():
    try:
        myresult = getLandValueModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400