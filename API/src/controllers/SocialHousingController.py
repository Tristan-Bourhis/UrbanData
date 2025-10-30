from flask import jsonify
from models.SocialHousingModel import getSocialHousingModel
from controllers.response_controller import set_response_headers

def getSocialHousingController():
    try:
        myresult = getSocialHousingModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400