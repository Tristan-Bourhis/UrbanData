from flask import Blueprint, request, jsonify
from controllers.HelloWorldController import HelloWorldRoute
from controllers.ToiletController import getToiletByAController
from controllers.CsrfController import get_csrf_token
from controllers.SocialHousingController import getSocialHousingController
from controllers.TransportController import getNumberStationByAController
from controllers.TransportController import getRatioTypeStationByAController
from controllers.TransportController import getStationsPointsController
from controllers.TreeController import getTreeController
from controllers.TreeController import getTreeNumberController
from controllers.LandValueContoller import getLandValueModelController
from controllers.LogController import getApiLogsController
from extension import limiter

reorderBlueprint = Blueprint('reorder', __name__)

@reorderBlueprint.route('/', methods=['GET'])
@limiter.limit("20 per minute")
def hello_world():
    return HelloWorldRoute()

@reorderBlueprint.route('/get-token', methods=['GET'])
@limiter.limit("2 per day")
def get_token():
    return get_csrf_token()

@reorderBlueprint.route('/get-toilet-by-a', methods=['GET'])
@limiter.limit("20 per minute")
def get_toilet_by_a():
    return getToiletByAController()

@reorderBlueprint.route('/get-social-housing', methods=['GET'])
@limiter.limit("20 per minute")
def get_social_housing():
    return getSocialHousingController()

@reorderBlueprint.route('/get-number-station', methods=['GET'])
@limiter.limit("20 per minute")
def get_number_station():
    return getNumberStationByAController()

@reorderBlueprint.route('/get-type-ratio-station', methods=['GET'])
@limiter.limit("20 per minute")
def get_type_ratio_station():
    return getRatioTypeStationByAController()

@reorderBlueprint.route('/get-stations-points', methods=['GET'])
@limiter.limit("20 per minute")
def get_stations_points():
    return getStationsPointsController()

@reorderBlueprint.route('/get-tree', methods=['GET'])
@limiter.limit("20 per minute")
def get_tree():
    return getTreeController()

@reorderBlueprint.route('/get-tree-number', methods=['GET'])
@limiter.limit("20 per minute")
def get_tree_number():
    return getTreeNumberController()

@reorderBlueprint.route('/get-land-value', methods=['GET'])
@limiter.limit("20 per minute")
def get_land_value():
    return getLandValueModelController()

@reorderBlueprint.route('/get-logs', methods=['GET'])
@limiter.limit("20 per minute")
def get_logs():
    return getApiLogsController()