from mysql.connector import Error
from bd import get_db_connection

def insert_api_key_users():
    try:
        connection = get_db_connection()
        if connection.is_connected():
            cursor = connection.cursor(dictionary=True, buffered=True)

            cursor.execute("DROP TABLE IF EXISTS api_key_user;")
            
            create_table_query = """
            CREATE TABLE IF NOT EXISTS api_key_user (
                id INT NOT NULL AUTO_INCREMENT,
                username VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                api_key VARCHAR(255) NOT NULL,
                role ENUM('admin','editor','viewer') DEFAULT 'viewer',
                permissions JSON DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            """
            cursor.execute(create_table_query)

            insert_query = """
            INSERT INTO api_key_user (username, password_hash, api_key, role, permissions, created_at)
            VALUES (%s, %s, %s, %s, CAST(%s AS JSON), %s);
            """

            users = [
                (
                    'admin',
                    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
                    'APIKEY-ADMIN-12345',
                    'admin',
                    '["get-token"]',
                    '2025-10-07 16:57:53'
                ),
                (
                    'editor',
                    'ef5e5a1fb95055e0e56cccf98a41e784a132c14e7f6e1ba244302f0e72b29baf',
                    'APIKEY-EDITOR-55555',
                    'editor',
                    '["get-token"]',
                    '2025-10-07 16:57:53'
                ),
                (
                    'viewer',
                    '65375049b9e4d7cad6c9ba286fdeb9394b28135a3e84136404cfccfdcc438894',
                    'APIKEY-VIEWER-67890',
                    'viewer',
                    '["get-token"]',
                    '2025-10-07 16:57:53'
                )
            ]

            cursor.executemany(insert_query, users)
            connection.commit()

    except Error as e:
        print(e)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    insert_api_key_users()
