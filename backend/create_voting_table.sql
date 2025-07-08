-- Create debate_votes table for voting system
CREATE TABLE IF NOT EXISTS debate_votes (
    id VARCHAR PRIMARY KEY,
    pick_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    vote_option VARCHAR NOT NULL CHECK (vote_option IN ('option1', 'option2')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pick_id) REFERENCES debate_picks(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_debate_votes_pick_id ON debate_votes(pick_id);
CREATE INDEX IF NOT EXISTS idx_debate_votes_user_id ON debate_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_votes_pick_user ON debate_votes(pick_id, user_id);

-- Add unique constraint to prevent duplicate votes from same user on same debate
ALTER TABLE debate_votes ADD CONSTRAINT unique_user_vote UNIQUE (pick_id, user_id); 