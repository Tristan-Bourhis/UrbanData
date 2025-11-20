from flask import Blueprint, request, jsonify
from controllers.HelloWorldController import HelloWorldRoute
from controllers.ToiletController import getToiletByAController
from controllers.CsrfController import get_csrf_token
from controllers.SocialHousingController import getSocialHousingController
from controllers.TransportController import getNumberStationByAController
from controllers.TransportController import getRatioTypeStationByAController
from controllers.TransportController import getStationsPointsController
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

@reorderBlueprint.route('/get-toilet-by-a', methods=['GET'])
def get_toilet_by_a():
    return getToiletByAController()

@reorderBlueprint.route('/get-social-housing', methods=['GET'])
def get_social_housing():
    return getSocialHousingController()

@reorderBlueprint.route('/get-number-station', methods=['GET'])
def get_number_station():
    return getNumberStationByAController()

@reorderBlueprint.route('/get-type-ratio-station', methods=['GET'])
def get_type_ratio_station():
    return getRatioTypeStationByAController()

@reorderBlueprint.route('/get-stations-points', methods=['GET'])
def get_stations_points():
    return getStationsPointsController()