from flask import jsonify
from models.TransportModel import getNumberStationByAModel
from models.TransportModel import getRatioTypeStationByAModel
from models.TransportModel import getStationspointsModel
from controllers.response_controller import set_response_headers

def getNumberStationByAController():
    try:
        myresult = getNumberStationByAModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400
    
def getRatioTypeStationByAController():
    try:
        myresult = getRatioTypeStationByAModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400
    

def getStationsPointsController():
    try:
        myresult = getStationspointsModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400