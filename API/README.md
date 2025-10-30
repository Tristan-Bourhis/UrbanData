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
   ```

2. **Create a SSL certificate (optionnal)**

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

4. **Generate your API token**

   ```bash
   curl -H "X-API-KEY: APIKEY-VIEWER-67890" https://127.0.0.1:5000/api/get-token
   ```

5. **Test the API**

   ! Comment the csrf = CSRFProtect(app) in the app.py for testing the API in Postman or anything else!
   You can also use Postman with the assets/Flask API Efrei.postman_collection.json
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
