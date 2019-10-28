SET character_set_server = utf8mb4;
CREATE DATABASE IF NOT EXISTS bot;
USE bot;
CREATE TABLE IF NOT EXISTS constants (
    id INT AUTO_INCREMENT UNIQUE,
    name VARCHAR(100) UNIQUE,
    value VARCHAR(100),
    key(id)
);
