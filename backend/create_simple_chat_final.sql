-- Simple Chat Messages Table Creation
-- Execute this after fixing the database password issue

DROP TABLE IF EXISTS simple_chat_messages CASCADE;

CREATE TABLE simple_chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_username VARCHAR NOT NULL,
    receiver_username VARCHAR NOT NULL,
    message_content TEXT NOT NULL,
    message_type VARCHAR DEFAULT 'text',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create performance indexes
CREATE INDEX idx_simple_chat_sender ON simple_chat_messages(sender_username);
CREATE INDEX idx_simple_chat_receiver ON simple_chat_messages(receiver_username);
CREATE INDEX idx_simple_chat_timestamp ON simple_chat_messages(sent_at);
CREATE INDEX idx_simple_chat_unread ON simple_chat_messages(receiver_username, is_read);

-- Insert test data
INSERT INTO simple_chat_messages (sender_username, receiver_username, message_content) VALUES
('testuser1', 'testuser2', 'Hello! Authentication fixed!'),
('testuser2', 'testuser1', 'Great! Chat system working!');

-- Verify creation
SELECT 'Table created successfully with Kais123 password!' as status;
SELECT COUNT(*) as message_count FROM simple_chat_messages; 