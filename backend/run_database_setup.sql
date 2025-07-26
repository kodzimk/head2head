-- Simple Chat Database Setup
-- Run this in your PostgreSQL database to create the required table

-- Drop existing table if it exists
DROP TABLE IF EXISTS simple_chat_messages CASCADE;

-- Create the simple_chat_messages table
CREATE TABLE simple_chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_username VARCHAR NOT NULL,
    receiver_username VARCHAR NOT NULL,
    message_content TEXT NOT NULL,
    message_type VARCHAR DEFAULT 'text',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_simple_chat_sender ON simple_chat_messages(sender_username);
CREATE INDEX idx_simple_chat_receiver ON simple_chat_messages(receiver_username);
CREATE INDEX idx_simple_chat_timestamp ON simple_chat_messages(sent_at);
CREATE INDEX idx_simple_chat_unread ON simple_chat_messages(receiver_username, is_read);

-- Insert test data
INSERT INTO simple_chat_messages (sender_username, receiver_username, message_content) VALUES
('testuser1', 'testuser2', 'Hello! This is a test message.'),
('testuser2', 'testuser1', 'Hi there! Test reply.'),
('gamedevelo', 'friend1', 'Welcome to the chat system!');

-- Verify table creation
SELECT 'Table created successfully!' as status;
SELECT COUNT(*) as message_count FROM simple_chat_messages; 