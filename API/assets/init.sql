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
