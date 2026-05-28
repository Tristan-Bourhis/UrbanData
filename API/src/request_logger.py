import time
from datetime import datetime, timezone
from flask import request, g
from mongo import get_logs_collection, ensure_indexes


def init_request_logging(app):
    try:
        ensure_indexes()
    except Exception as exc:
        app.logger.warning("Could not create MongoDB log indexes: %s", exc)

    @app.before_request
    def _start_timer():
        g._log_start = time.perf_counter()

    @app.after_request
    def _persist_log(response):
        try:
            started = getattr(g, "_log_start", None)
            duration_ms = (
                round((time.perf_counter() - started) * 1000, 2)
                if started is not None
                else None
            )

            user = getattr(g, "log_user", None) or {}
            document = {
                "timestamp": datetime.now(timezone.utc),
                "method": request.method,
                "path": request.path,
                "query_string": request.query_string.decode("utf-8", "replace"),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "remote_addr": request.remote_addr,
                "user_agent": request.headers.get("User-Agent"),
                "api_key_present": bool(request.headers.get("X-API-KEY")),
                "user_id": user.get("id"),
                "username": user.get("username"),
                "content_length": response.calculate_content_length(),
            }
            get_logs_collection().insert_one(document)
        except Exception as exc:
            app.logger.warning("Failed to write API log to MongoDB: %s", exc)

        return response
