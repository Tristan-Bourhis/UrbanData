import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from routes.reorderRoutes import reorderBlueprint
from flask_wtf import CSRFProtect
from dotenv import load_dotenv
from bd import get_db_connection
from extension import limiter

load_dotenv()
app = Flask(__name__)
SECRET_KEY = os.getenv("SECRET_KEY")
app.secret_key = SECRET_KEY
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app,
     origins=[
         "http://localhost:3443",
         "http://localhost:5000",
         "http://127.0.0.1:5000",
         "http://141.227.133.132:3443",
         "http://www.efreiprojeturban.theval.ovh/",
     ],
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "X-API-KEY"])

limiter.init_app(app)
csrf = CSRFProtect(app)
app.register_blueprint(reorderBlueprint, url_prefix='/api')

@app.errorhandler(404)
def page_not_found(e):
    return Response("Not found !", status=404)

@app.before_request
def check_api_key():
    if request.method == 'OPTIONS':
        return
    
    public_routes = ['/api']
    if request.path in public_routes:
        return

    api_key = request.headers.get("X-API-KEY")
    if not api_key:
        return jsonify({"error": "Missing API key"}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    cursor.execute("SELECT id, username, permissions FROM api_key_user WHERE api_key = %s", (api_key,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return jsonify({"error": "Invalid API key"}), 403
    
    route_perm_map = {
        '/api/get-token': 'get-token',
        '/api/get-toilet-by-a': 'get-token',
        '/api/get-social-housing': 'get-token',
        '/api/get-number-station': 'get-token',
        '/api/get-type-ratio-station': 'get-token',
        '/api/get-stations-points': 'get-token',
        '/api/get-tree': 'get-token',
        '/api/get-tree-number': 'get-token',
        '/api/get-land-value': 'get-token',
    }

    for route_prefix, perm in route_perm_map.items():
        if request.path.startswith(route_prefix):
            perms = user["permissions"]
            if perms is None or perm not in perms:
                cursor.close()
                conn.close()
                return jsonify({"error": "Access denied: insufficient permissions"}), 403

    cursor.close()
    conn.close()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)