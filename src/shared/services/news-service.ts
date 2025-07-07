// News Service for NewsAPI.org integration
// API Documentation: https://newsapi.org

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const NEWS_API_KEY = import.meta.env.REACT_APP_NEWS_API_KEY || 'd3b4e2f589a64f398becf1e1d7a775f2';

export interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export interface NewsApiError {
  status: string;
  code: string;
  message: string;
}

export class NewsService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || NEWS_API_KEY;
    this.baseUrl = NEWS_API_BASE_URL;
  }

  /**
   * Check if API key is properly configured
   */
  isApiKeyValid(): boolean {
    return this.apiKey !== 'YOUR_API_KEY_HERE' && !!this.apiKey && this.apiKey.trim().length > 0;
  }

  /**
   * Get API key status for debugging
   */
  getApiKeyStatus(): { isValid: boolean; key: string; message: string } {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return {
        isValid: false,
        key: 'undefined',
        message: 'API key is not set. Please add VITE_NEWS_API_KEY to your .env file.'
      };
    }
    
    if (this.apiKey === 'YOUR_API_KEY_HERE') {
      return {
        isValid: false,
        key: 'placeholder',
        message: 'Using placeholder API key. Please get your real API key from https://newsapi.org'
      };
    }

    return {
      isValid: true,
      key: this.apiKey.substring(0, 8) + '...',
      message: 'API key appears to be configured correctly.'
    };
  }

  /**
   * Fetch top sports headlines
   * @param options - Configuration options for the request
   */
  async getTopSportsHeadlines(options: {
    country?: string;
    category?: string;
    sources?: string;
    q?: string;
    pageSize?: number;
    page?: number;
  } = {}): Promise<NewsApiResponse> {
    const {
      country = 'us',
      category = 'sports',
      sources,
      q,
      pageSize = 20,
      page = 1
    } = options;

    const params = new URLSearchParams({
      apiKey: this.apiKey,
      pageSize: pageSize.toString(),
      page: page.toString()
    });

    if (country && !sources) params.append('country', country);
    if (category && !sources) params.append('category', category);
    if (sources) params.append('sources', sources);
    if (q) params.append('q', q);

    const url = `${this.baseUrl}/top-headlines?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch news');
      }

      return data;
    } catch (error) {
      console.error('Error fetching sports headlines:', error);
      throw error;
    }
  }

  /**
   * Search for everything related to sports
   * @param query - Search query
   * @param options - Additional search options
   */
  async searchSportsNews(query: string, options: {
    domains?: string;
    excludeDomains?: string;
    from?: string;
    to?: string;
    language?: string;
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
    pageSize?: number;
    page?: number;
  } = {}): Promise<NewsApiResponse> {
    const {
      domains,
      excludeDomains,
      from,
      to,
      language = 'en',
      sortBy = 'publishedAt',
      pageSize = 20,
      page = 1
    } = options;

    const params = new URLSearchParams({
      q: query,
      apiKey: this.apiKey,
      language,
      sortBy,
      pageSize: pageSize.toString(),
      page: page.toString()
    });

    if (domains) params.append('domains', domains);
    if (excludeDomains) params.append('excludeDomains', excludeDomains);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const url = `${this.baseUrl}/everything?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to search news');
      }

      return data;
    } catch (error) {
      console.error('Error searching sports news:', error);
      throw error;
    }
  }

  /**
   * Get breaking news (recent articles from the last hour)
   */
  async getBreakingNews(sport?: string): Promise<NewsApiResponse> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const query = sport ? `${sport} AND sports` : 'sports';
    
    return this.searchSportsNews(query, {
      from: oneHourAgo,
      sortBy: 'publishedAt',
      pageSize: 10
    });
  }

  /**
   * Get transfer news for specific sports
   */
  async getTransferNews(sports: string[] = ['football', 'basketball', 'volleyball']): Promise<NewsApiResponse> {
    const query = sports.map(sport => `("${sport}" AND (transfer OR trade OR signing OR deal))`).join(' OR ');
    
    return this.searchSportsNews(query, {
      sortBy: 'publishedAt',
      pageSize: 15
    });
  }

  /**
   * Get sport-specific news
   */
  async getSportNews(sport: string, options: {
    type?: 'headlines' | 'everything';
    pageSize?: number;
  } = {}): Promise<NewsApiResponse> {
    const { type = 'everything', pageSize = 20 } = options;
    
    if (type === 'headlines') {
      return this.getTopSportsHeadlines({
        q: sport,
        pageSize
      });
    } else {
      return this.searchSportsNews(sport, {
        sortBy: 'publishedAt',
        pageSize
      });
    }
  }

  /**
   * Convert NewsAPI article to Forum post format
   */
  convertToForumPost(article: NewsApiArticle, type: 'news' | 'transfer' = 'news'): any {
    const isBreaking = this.isBreakingNews(article.publishedAt);
    const importance = this.getNewsImportance(article.title, article.description);
    
    return {
      id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: article.title,
      content: article.description || article.content?.substring(0, 200) + '...' || '',
      author: article.author || article.source.name,
      authorAvatar: '/images/placeholder-user.jpg',
      timestamp: new Date(article.publishedAt),
      category: this.extractCategory(article.title),
      sport: this.extractSport(article.title, article.description),
      likes: Math.floor(Math.random() * 100) + 10, // Simulated engagement
      comments: Math.floor(Math.random() * 50) + 5,
      isLiked: false,
      tags: this.extractTags(article.title, article.description),
      type: type,
      newsDetails: {
        source: article.source.name,
        importance,
        breaking: isBreaking,
        url: article.url,
        imageUrl: article.urlToImage
      }
    };
  }

  /**
   * Check if news is breaking (published within last 2 hours)
   */
  private isBreakingNews(publishedAt: string): boolean {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return new Date(publishedAt) > twoHoursAgo;
  }

  /**
   * Determine news importance based on title and description
   */
  private getNewsImportance(title: string, description: string): 'low' | 'medium' | 'high' {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    const highImportanceKeywords = ['breaking', 'record', 'championship', 'final', 'trade', 'signs', 'injured', 'suspended', 'fired'];
    const mediumImportanceKeywords = ['wins', 'loses', 'announced', 'confirms', 'reports', 'playoff'];
    
    if (highImportanceKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    } else if (mediumImportanceKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Extract sport from title and description
   */
  private extractSport(title: string, description: string): string {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    const sports = [
      { name: 'Football', keywords: ['nfl', 'football', 'quarterback', 'touchdown'] },
      { name: 'Basketball', keywords: ['nba', 'basketball', 'playoff', 'finals'] },
      { name: 'Baseball', keywords: ['mlb', 'baseball', 'world series', 'pitcher'] },
      { name: 'Soccer', keywords: ['soccer', 'fifa', 'world cup', 'premier league'] },
      { name: 'Tennis', keywords: ['tennis', 'wimbledon', 'us open', 'grand slam'] },
      { name: 'Hockey', keywords: ['nhl', 'hockey', 'stanley cup'] },
      { name: 'Volleyball', keywords: ['volleyball', 'olympics'] }
    ];
    
    for (const sport of sports) {
      if (sport.keywords.some(keyword => text.includes(keyword))) {
        return sport.name;
      }
    }
    
    return 'General Sports';
  }

  /**
   * Extract category from title
   */
  private extractCategory(title: string): string {
    const text = title.toLowerCase();
    
    if (text.includes('trade') || text.includes('transfer') || text.includes('signing')) {
      return 'Transfer News';
    } else if (text.includes('injury') || text.includes('injured')) {
      return 'Injury Report';
    } else if (text.includes('playoff') || text.includes('championship') || text.includes('final')) {
      return 'Playoff News';
    } else if (text.includes('contract') || text.includes('deal')) {
      return 'Contract News';
    }
    
    return 'General News';
  }

  /**
   * Extract tags from title and description
   */
  private extractTags(title: string, description: string): string[] {
    const text = (title + ' ' + (description || '')).toLowerCase();
    const tags: string[] = [];
    
    const tagKeywords = [
      'breaking', 'trade', 'injury', 'playoff', 'championship', 'contract', 
      'signing', 'record', 'final', 'nfl', 'nba', 'mlb', 'nhl'
    ];
    
    tagKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
    
    return tags.slice(0, 3); // Limit to 3 tags
  }
}

// Export singleton instance
export const newsService = new NewsService(); 