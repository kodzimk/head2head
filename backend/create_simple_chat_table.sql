-- Create simple chat messages table without foreign keys
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

-- Create indexes for better performance
CREATE INDEX idx_simple_chat_sender ON simple_chat_messages(sender_username);
CREATE INDEX idx_simple_chat_receiver ON simple_chat_messages(receiver_username);
CREATE INDEX idx_simple_chat_timestamp ON simple_chat_messages(sent_at);

-- Insert some sample data for testing
INSERT INTO simple_chat_messages (sender_username, receiver_username, message_content) VALUES
('alice', 'bob', 'Hello Bob!'),
('bob', 'alice', 'Hi Alice! How are you?'),
('alice', 'bob', 'I am doing great, thanks!');

-- Display sample data
SELECT * FROM simple_chat_messages ORDER BY sent_at; 