from flask import jsonify

def HelloWorld():
    try:
        return "Hello World"
    except Exception as e:
        return jsonify(error=str(e)), 400