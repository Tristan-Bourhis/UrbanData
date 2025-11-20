from flask import jsonify
from models.TreeModel import getTreeModel
from models.TreeModel import getTreeNumberModel
from controllers.response_controller import set_response_headers

def getTreeController():
    try:
        myresult = getTreeModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400
    

def getTreeNumberController():
    try:
        myresult = getTreeNumberModel()
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400