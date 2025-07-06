export interface Team {
  name: string;
  image: string;
  votes: number;
  description: string;
}

export interface Comment {
  id: string;
  pickId?: string;
  authorId?: string;
  authorName?: string;
  content?: string;
  text?: string;
  author?: string;
  likes: string[];
  timestamp?: string;
  createdAt?: Date;
  likedBy?: string[];
  liked?: boolean;
  likes_count?: number;
}

export interface Selection {
  id: string;
  category: string;
  teamA: {
    name: string;
    description: string;
    image: string;
    votes: number;
  };
  teamB: {
    name: string;
    description: string;
    image: string;
    votes: number;
  };
  comments: Comment[];
}

export interface Pick {
  id: string;
  option1_name: string;
  option1_image: string;
  option1_votes: number;
  option2_name: string;
  option2_image: string;
  option2_votes: number;
  category: string;
  createdAt: Date;
}

export interface Voter {
  userId: string;
  option: 'option1' | 'option2';
  votedAt: Date;
}

export interface VoteResult {
  option1Percentage: number;
  option2Percentage: number;
  totalVotes: number;
} 