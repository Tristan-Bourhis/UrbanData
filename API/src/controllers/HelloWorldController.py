from flask import jsonify
from models.HelloWorldModel import HelloWorld
from controllers.response_controller import set_response_headers

def HelloWorldRoute():
    try:
        myresult = HelloWorld()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400