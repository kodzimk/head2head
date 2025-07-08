-- Setup Voting System for Head2Head Debates
-- This script creates the debate_votes table and ensures proper setup

-- Drop the table if it exists to ensure clean setup
DROP TABLE IF EXISTS debate_votes CASCADE;

-- Create the debate_votes table
CREATE TABLE debate_votes (
    id VARCHAR PRIMARY KEY,
    pick_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    vote_option VARCHAR NOT NULL CHECK (vote_option IN ('option1', 'option2')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint
ALTER TABLE debate_votes 
ADD CONSTRAINT fk_debate_votes_pick_id 
FOREIGN KEY (pick_id) REFERENCES debate_picks(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_debate_votes_pick_id ON debate_votes(pick_id);
CREATE INDEX idx_debate_votes_user_id ON debate_votes(user_id);
CREATE INDEX idx_debate_votes_pick_user ON debate_votes(pick_id, user_id);

-- Add unique constraint to prevent duplicate votes from same user on same debate
ALTER TABLE debate_votes ADD CONSTRAINT unique_user_vote UNIQUE (pick_id, user_id);

-- Verify the table was created correctly
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'debate_votes' 
ORDER BY ordinal_position;

-- Show table structure
\d debate_votes; 