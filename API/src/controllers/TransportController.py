from flask import jsonify
from models.TransportModel import getNumberStationByA
from models.TransportModel import getRatioTypeStationByA
from controllers.response_controller import set_response_headers

def getNumberStationByAController():
    try:
        myresult = getNumberStationByA()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400
    
def getRatioTypeStationByAController():
    try:
        myresult = getRatioTypeStationByA()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400