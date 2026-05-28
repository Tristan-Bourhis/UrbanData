import os
from pymongo import MongoClient, ASCENDING, DESCENDING

_client = None

def get_mongo_client():
    global _client
    if _client is None:
        _client = MongoClient(
            host=os.getenv("MONGO_HOST", "mongo"),
            port=int(os.getenv("MONGO_PORT", "27017")),
            username=os.getenv("MONGO_USER", "root"),
            password=os.getenv("MONGO_PASSWORD", "root"),
            authSource="admin",
            serverSelectionTimeoutMS=2000,
        )
    return _client


def get_logs_collection():
    db = get_mongo_client()[os.getenv("MONGO_DB", "urbandata_logs")]
    collection = db["api_logs"]
    return collection


def ensure_indexes():
    collection = get_logs_collection()
    collection.create_index([("timestamp", DESCENDING)])
    collection.create_index([("path", ASCENDING)])
    collection.create_index([("status_code", ASCENDING)])

    ttl_days = int(os.getenv("LOG_TTL_DAYS", "30"))
    if ttl_days > 0:
        collection.create_index(
            [("timestamp", ASCENDING)],
            name="ttl_timestamp",
            expireAfterSeconds=ttl_days * 24 * 3600,
        )
