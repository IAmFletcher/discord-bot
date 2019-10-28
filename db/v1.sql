CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT UNIQUE,
    guild_id VARCHAR(64),
    message_id VARCHAR(64),
    reaction VARCHAR(100),
    role VARCHAR(100),
    key(id)
);

INSERT INTO constants (name, value) VALUES ("db_version", "1");
