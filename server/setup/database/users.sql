-- Users table for Event Planner Lite API
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(40) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    tos_consent_at TIMESTAMP NOT NULL,
    privacy_consent_at TIMESTAMP NOT NULL,
    timezone VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
