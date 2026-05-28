from flask import jsonify, request, g
from models.LogModel import getApiLogsModel
from controllers.response_controller import set_response_headers


def getApiLogsController():
    user = getattr(g, "log_user", None) or {}
    if user.get("role") != "admin":
        return jsonify(error="Access denied: admin role required"), 403

    try:
        limit = request.args.get("limit", default=100, type=int)
        status_code = request.args.get("status", default=None, type=int)
        path = request.args.get("path", default=None, type=str)

        myresult = getApiLogsModel(limit=limit, status_code=status_code, path=path)
        response = jsonify(data=myresult)
        response = set_response_headers(response)
        return response, 200
    except Exception as e:
        return jsonify(error=str(e)), 400
