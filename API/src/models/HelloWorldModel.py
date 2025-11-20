from flask import jsonify

def HelloWorldModel():
    try:
        return "Hello World"
    except Exception as e:
        return jsonify(error=str(e)), 400