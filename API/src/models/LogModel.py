from mongo import get_logs_collection
from pymongo import DESCENDING


def getApiLogsModel(limit=100, status_code=None, path=None):
    query = {}
    if status_code is not None:
        query["status_code"] = int(status_code)
    if path:
        query["path"] = path

    cursor = (
        get_logs_collection()
        .find(query)
        .sort("timestamp", DESCENDING)
        .limit(int(limit))
    )

    logs = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("timestamp") is not None:
            doc["timestamp"] = doc["timestamp"].isoformat()
        logs.append(doc)
    return logs
