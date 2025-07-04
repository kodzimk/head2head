export interface Team {
  name: string;
  image: string;
  votes: number;
  description: string;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  likes: number;
  timestamp: string;
  replies: Comment[];
  parentId?: string;
  likedBy: string[];
}

export interface Selection {
  id: string;
  category: 'football' | 'basketball' | 'tennis';
  teamA: Team;
  teamB: Team;
  comments: Comment[];
} 