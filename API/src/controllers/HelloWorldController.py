from flask import jsonify
from models.HelloWorldModel import HelloWorldModel
from controllers.response_controller import set_response_headers

def HelloWorldRoute():
    try:
        myresult = HelloWorldModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400