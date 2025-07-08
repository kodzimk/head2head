import { API_BASE_URL } from '../interface/gloabL_var';

export interface DebatePick {
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
}

export interface DebateComment {
  id: string;
  pick_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  likes_count: number;
  user_liked: boolean;
}

export interface CreateDebateData {
  option1_name: string;
  option1_description?: string;
  option2_name: string;
  option2_description?: string;
  category: string;
}

export interface CommentData {
  pick_id: string;
  content: string;
  parent_id?: string;  // For replies
}

export interface CommentLikeData {
  comment_id: string;
}

export interface VoteData {
  vote_option: 'option1' | 'option2';
}

export interface DebatePickWithVote extends DebatePick {
  user_vote?: 'option1' | 'option2' | null;
}



class DebateService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/selection`;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get authentication token and clean it (remove quotes if present)
    const rawToken = localStorage.getItem('access_token');
    const token = rawToken ? rawToken.replace(/"/g, '') : null;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `HTTP error! status: ${response.status}`;
        console.error('Debate service error details:', errorData);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Debate service error:', error);
      throw error;
    }
  }

  // Get all debates with optional filtering
  async getDebates(params?: {
    category?: string;
    sport?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'latest' | 'trending' | 'most_voted';
  }): Promise<DebatePick[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.category) searchParams.append('category', params.category);
    if (params?.sport) searchParams.append('sport', params.sport);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.sortBy) searchParams.append('sort_by', params.sortBy);

    const queryString = searchParams.toString();
    const endpoint = `/picks${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<DebatePick[]>(endpoint);
  }

  // Get a specific debate by ID
  async getDebate(id: string): Promise<DebatePick> {
    return this.makeRequest<DebatePick>(`/picks/${id}`);
  }

  // Create a new debate
  async createDebate(data: CreateDebateData): Promise<DebatePick> {
    return this.makeRequest<DebatePick>('/picks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }



  // Get comments for a debate
  async getDebateComments(pickId: string): Promise<DebateComment[]> {
    return this.makeRequest<DebateComment[]>(`/picks/${pickId}/comments`);
  }

  // Add a comment to a debate
  async addComment(data: CommentData): Promise<DebateComment> {
    return this.makeRequest<DebateComment>(`/picks/${data.pick_id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ 
        content: data.content,
        parent_id: data.parent_id 
      }),
    });
  }

  // Like a comment
  async likeComment(commentId: string): Promise<{ id: string; comment_id: string; user_id: string; created_at: string }> {
    return this.makeRequest<{ id: string; comment_id: string; user_id: string; created_at: string }>(`/comments/${commentId}/like`, {
      method: 'POST',
    });
  }

  // Unlike a comment
  async unlikeComment(commentId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/comments/${commentId}/like`, {
      method: 'DELETE',
    });
  }

  // Get replies for a comment
  async getCommentReplies(commentId: string): Promise<DebateComment[]> {
    return this.makeRequest<DebateComment[]>(`/comments/${commentId}/replies`);
  }

  // Get debate categories
  async getCategories(): Promise<string[]> {
    return this.makeRequest<string[]>('/categories');
  }

  // Get trending debates (debates with high engagement)
  async getTrendingDebates(limit: number = 10): Promise<DebatePick[]> {
    return this.getDebates({ 
      sortBy: 'trending', 
      limit 
    });
  }

  // Get debates by sport
  async getDebatesBySport(sport: string, limit: number = 20): Promise<DebatePick[]> {
    return this.getDebates({ 
      sport, 
      limit,
      sortBy: 'latest'
    });
  }

  // Search debates by title or description
  async searchDebates(query: string, limit: number = 20): Promise<DebatePick[]> {
    const searchParams = new URLSearchParams({
      search: query,
      limit: limit.toString(),
    });
    
    return this.makeRequest<DebatePick[]>(`/picks/search?${searchParams}`);
  }

  // Get user's created debates
  async getUserDebates(username: string, limit: number = 20): Promise<DebatePick[]> {
    const searchParams = new URLSearchParams({
      author: username,
      limit: limit.toString(),
    });
    
    return this.makeRequest<DebatePick[]>(`/picks?${searchParams}`);
  }

  // Get user's voted debates
  async getUserVotedDebates(username: string, limit: number = 20): Promise<DebatePick[]> {
    const searchParams = new URLSearchParams({
      voted_by: username,
      limit: limit.toString(),
    });
    
    return this.makeRequest<DebatePick[]>(`/picks?${searchParams}`);
  }

  // Vote on a debate
  async voteOnDebate(pickId: string, voteOption: 'option1' | 'option2'): Promise<{ id: string; pick_id: string; user_id: string; vote_option: string; created_at: string }> {
    return this.makeRequest<{ id: string; pick_id: string; user_id: string; vote_option: string; created_at: string }>(`/picks/${pickId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote_option: voteOption }),
    });
  }

  // Remove vote from a debate
  async removeVote(pickId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/picks/${pickId}/vote`, {
      method: 'DELETE',
    });
  }

  // Get user's vote for a specific debate
  async getUserVote(pickId: string): Promise<{ user_vote: 'option1' | 'option2' | null }> {
    return this.makeRequest<{ user_vote: 'option1' | 'option2' | null }>(`/picks/${pickId}/vote`);
  }

  // Get debate with user's vote information
  async getDebateWithVote(id: string): Promise<DebatePickWithVote> {
    return this.makeRequest<DebatePickWithVote>(`/picks/${id}/with-vote`);
  }

  // Helper method to format debate for display
  formatDebateForDisplay(debate: DebatePick) {
    return {
      ...debate,
      is_trending: (debate.option1_votes + debate.option2_votes) > 100,
    };
  }

  // Helper method to check if debate is trending
  isTrending(debate: DebatePick): boolean {
    return (debate.option1_votes + debate.option2_votes) > 100;
  }
}

export const debateService = new DebateService();
export default debateService; 