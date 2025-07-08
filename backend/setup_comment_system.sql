-- Setup Enhanced Comment System for Head2Head Debates
-- This script creates the comment_likes table and updates the debate_comments table

-- Drop the comment_likes table if it exists
DROP TABLE IF EXISTS comment_likes CASCADE;

-- Add parent_id column to debate_comments if it doesn't exist
ALTER TABLE debate_comments ADD COLUMN IF NOT EXISTS parent_id VARCHAR;

-- Create the comment_likes table
CREATE TABLE comment_likes (
    id VARCHAR PRIMARY KEY,
    comment_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE comment_likes 
ADD CONSTRAINT fk_comment_likes_comment_id 
FOREIGN KEY (comment_id) REFERENCES debate_comments(id) ON DELETE CASCADE;

ALTER TABLE debate_comments 
ADD CONSTRAINT fk_debate_comments_parent_id 
FOREIGN KEY (parent_id) REFERENCES debate_comments(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX idx_comment_likes_comment_user ON comment_likes(comment_id, user_id);
CREATE INDEX idx_debate_comments_parent_id ON debate_comments(parent_id);
CREATE INDEX idx_debate_comments_pick_parent ON debate_comments(pick_id, parent_id);

-- Add unique constraint to prevent duplicate likes from same user on same comment
ALTER TABLE comment_likes ADD CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id);

-- Verify the tables were created correctly
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('comment_likes', 'debate_comments')
ORDER BY table_name, ordinal_position;

-- Show table structures
\d comment_likes;
\d debate_comments; 