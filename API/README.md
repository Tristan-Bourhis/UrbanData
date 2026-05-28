## 🧩 Project Architecture

```
project-root/
│
├── .env
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── src/
    ├── app.py
    ├── db.py
    ├── routes/
    │   └── reorderRoutes.py
    ├── controllers/
    │   └── reorderController.py
    └── models/
        └── reorderModel.py
```

## 🔐 API Key Permissions

### SQL Schema for Users and Permissions

```sql
CREATE TABLE IF NOT EXISTS `api_key_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `role` enum('admin','editor','viewer') DEFAULT 'viewer',
  `permissions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `api_key_user`
(`username`, `password_hash`, `api_key`, `role`, `permissions`, `created_at`)
VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'APIKEY-ADMIN-12345', 'admin', CAST('["get-token", "view_users"]' AS JSON), '2025-10-07 16:57:53'),
('editor', 'ef5e5a1fb95055e0e56cccf98a41e784a132c14e7f6e1ba244302f0e72b29baf', 'APIKEY-EDITOR-55555', 'editor', CAST('["get-token", "view_users"]' AS JSON), '2025-10-07 16:57:53'),
('viewer', '65375049b9e4d7cad6c9ba286fdeb9394b28135a3e84136404cfccfdcc438894', 'APIKEY-VIEWER-67890', 'viewer', CAST('["get-token", "view_users"]' AS JSON), '2025-10-07 16:57:53');
```

## 🛠️ Installation & Setup

1. **Create the `.env` file**

   ```
   MYSQL_ROOT_PASSWORD=rootpass
   MYSQL_DATABASE=flaskdb
   MYSQL_USER=flaskuser
   MYSQL_PASSWORD=flaskpass
   SECRET_KEY=random_long_stable_string

   # MongoDB (API logs) — optional, defaults shown
   MONGO_USER=root
   MONGO_PASSWORD=root
   MONGO_DB=urbandata_logs
   LOG_TTL_DAYS=30
   MONGO_EXPRESS_USER=admin
   MONGO_EXPRESS_PASSWORD=admin
   ```

2. **Create a SSL certificate (optionnal + you must have to update this : app.run(host="0.0.0.0", port=5000, debug=True))**

   ```bash
   cd src
   & "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 3650
   ```

3. **Build and start the containers**

   ```bash
   docker compose up --build
   ```

This will start:

- Flask API → [http://localhost:5000](http://localhost:5000)
- phpMyAdmin → [http://localhost:8080](http://localhost:8080)
- MySQL database → accessible internally as `db:3306`
- MongoDB (API logs) → accessible internally as `mongo:27017`
- mongo-express (logs viewer) → [http://localhost:8081](http://localhost:8081)

4. **Generate your API token**

   ```bash
   curl -H "X-API-KEY: APIKEY-VIEWER-67890" https://127.0.0.1:5000/api/get-token
   ```

5. **Test the API**

   ! Comment the csrf = CSRFProtect(app) in the app.py for testing the API in Postman or anything else!
   You can also use Postman with the assets/Flask API Efrei.postman_collection.json
   or open the Bruno collection in `API/bruno/` (includes a `Get API Logs` request hitting `/api/get-logs`).
   ! For POST and PUT methods, you have to put a X-CSRFToken and Referer header !
   - Test route:

     ```bash
     curl -H "X-API-KEY: APIKEY-VIEWER-67890" http://localhost:5000/api/
     ```

     ...

6. **Stopping and Cleaning**
   ```bash
   docker compose down -v
   ```

## 🗃️ API Logs (MongoDB)

Every HTTP request is logged to a **MongoDB** NoSQL database (document store),
which fits log data well: schemaless documents, fast time-ordered queries, and
automatic expiry.

### How it works

- `src/mongo.py` — lazy, process-wide `MongoClient` and the `api_logs` collection (with indexes + a TTL index controlled by `LOG_TTL_DAYS`).
- `src/request_logger.py` — `before_request`/`after_request` hooks that write **one document per request**. Logging is best-effort: a MongoDB outage never breaks an API response.

Each log document looks like:

```json
{
  "timestamp": "2026-05-26T20:40:00.000Z",
  "method": "GET",
  "path": "/api/get-tree",
  "query_string": "a=1",
  "status_code": 200,
  "duration_ms": 12.34,
  "remote_addr": "172.18.0.1",
  "user_agent": "curl/8.0",
  "api_key_present": true,
  "user_id": 1,
  "username": "admin",
  "content_length": 512
}
```

> The raw API key is **never** stored — only whether one was present and the
> resolved username/role.

### Reading the logs

- **Web UI:** open mongo-express at [http://localhost:8081](http://localhost:8081) → database `urbandata_logs` → collection `api_logs`.
- **API (admin only):** `GET /api/get-logs` returns the most recent logs as JSON.

  ```bash
  curl -H "X-API-KEY: APIKEY-ADMIN-12345" "http://localhost:5000/api/get-logs?limit=50"
  ```

  Optional query params: `limit` (default 100), `status` (HTTP code), `path`.
