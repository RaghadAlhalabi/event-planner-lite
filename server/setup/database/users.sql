
CREATE TABLE users (
    id VARCHAR(40) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    tos_consent_at TIMESTAMP NOT NULL,
    privacy_consent_at TIMESTAMP NOT NULL,
    timezone VARCHAR(64),
    password_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE,
    user_id VARCHAR(40) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);