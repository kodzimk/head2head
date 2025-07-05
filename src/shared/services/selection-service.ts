import { API_BASE_URL } from '../interface/gloabL_var';
import type { Pick, Comment } from '../../modules/selection/types';

export interface DebatePickResponse {
  id: string;
  category: string;
  option1_name: string;
  option1_image?: string;
  option1_description?: string;
  option1_votes: number;
  option2_name: string;
  option2_image?: string;
  option2_description?: string;
  option2_votes: number;
  created_at: string;
  is_active: boolean;
  user_vote?: 'option1' | 'option2';
}

export interface DebateCommentResponse {
  id: string;
  pick_id: string;
  author_id: string;
  author_name: string;
  content: string;
  parent_id?: string;
  created_at: string;
  likes_count: number;
  user_liked: boolean;
  replies: DebateCommentResponse[];
}

export interface VoteResultResponse {
  option1_percentage: number;
  option2_percentage: number;
  total_votes: number;
  user_vote?: 'option1' | 'option2';
}

class SelectionService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getAllPicks(category?: string, limit = 20, offset = 0): Promise<DebatePickResponse[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`${API_BASE_URL}/selection/picks?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch picks: ${response.statusText}`);
    }

    return response.json();
  }

  async getPick(pickId: string): Promise<DebatePickResponse> {
    const response = await fetch(`${API_BASE_URL}/selection/picks/${pickId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pick: ${response.statusText}`);
    }

    return response.json();
  }

  async createPick(pickData: {
    category: string;
    option1_name: string;
    option1_image?: string;
    option1_description?: string;
    option2_name: string;
    option2_image?: string;
    option2_description?: string;
  }): Promise<DebatePickResponse> {
    const response = await fetch(`${API_BASE_URL}/selection/picks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(pickData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create pick: ${response.statusText}`);
    }

    return response.json();
  }

  async voteOnPick(pickId: string, option: 'option1' | 'option2'): Promise<VoteResultResponse> {
    const response = await fetch(`${API_BASE_URL}/selection/picks/${pickId}/vote`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ pick_id: pickId, option }),
    });

    if (!response.ok) {
      throw new Error(`Failed to vote: ${response.statusText}`);
    }

    return response.json();
  }

  async getPickComments(pickId: string): Promise<DebateCommentResponse[]> {
    const response = await fetch(`${API_BASE_URL}/selection/picks/${pickId}/comments`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    return response.json();
  }

  async createComment(pickId: string, content: string, parentId?: string): Promise<DebateCommentResponse> {
    const response = await fetch(`${API_BASE_URL}/selection/picks/${pickId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ pick_id: pickId, content, parent_id: parentId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create comment: ${response.statusText}`);
    }

    return response.json();
  }

  async toggleCommentLike(commentId: string): Promise<{ liked: boolean; likes_count: number }> {
    const response = await fetch(`${API_BASE_URL}/selection/comments/${commentId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle like: ${response.statusText}`);
    }

    return response.json();
  }

  async getCategories(): Promise<{ categories: string[] }> {
    const response = await fetch(`${API_BASE_URL}/selection/categories`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper method to convert API response to frontend Pick format
  convertToPickFormat(apiPick: DebatePickResponse): Pick {
    return {
      id: apiPick.id,
      option1_name: apiPick.option1_name,
      option1_image: apiPick.option1_image || '',
      option1_votes: apiPick.option1_votes,
      option2_name: apiPick.option2_name,
      option2_image: apiPick.option2_image || '',
      option2_votes: apiPick.option2_votes,
      category: apiPick.category,
      createdAt: new Date(apiPick.created_at),
    };
  }

  // Helper method to convert API response to frontend Comment format
  convertToCommentFormat(apiComment: DebateCommentResponse): Comment {
    return {
      id: apiComment.id,
      pickId: apiComment.pick_id,
      authorId: apiComment.author_id,
      authorName: apiComment.author_name,
      content: apiComment.content,
      text: apiComment.content,
      author: apiComment.author_name,
      likes: Array(apiComment.likes_count).fill('').map((_, i) => `user${i}`), // Mock likes array
      timestamp: apiComment.created_at,
      createdAt: new Date(apiComment.created_at),
      parentId: apiComment.parent_id || null,
      replies: apiComment.replies.map(reply => this.convertToCommentFormat(reply)),
      likedBy: apiComment.user_liked ? ['current_user'] : [],
    };
  }

  async seedDebates(): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/selection/seed-debates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error seeding debates:', error);
      throw error;
    }
  }
}

export const selectionService = new SelectionService(); 