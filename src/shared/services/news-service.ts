// News Service for MediaStack API integration
// API Documentation: http://api.mediastack.com/

const MEDIASTACK_API_KEY = 'a47eccf6946b22529c1df36e45fb984b';

export interface MediaStackArticle {
  author: string | null;
  title: string;
  description: string;
  url: string;
  image: string | null;
  published_at: string;
  source: string;
  category: string;
  language: string;
  country: string;
}

export interface MediaStackResponse {
  data: MediaStackArticle[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

export interface MediaStackError {
  error: {
    code: string;
    message: string;
  };
}

export interface MultiLanguageNewsResponse {
  en: MediaStackResponse;
  ru?: MediaStackResponse;
}

export class NewsService {
  private apiKey: string;
  private backendUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || MEDIASTACK_API_KEY;
    this.backendUrl = 'https://api.head2head.dev';
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
        message: 'API key is not set. Please configure MediaStack API key.'
      };
    }
    
    if (this.apiKey === 'YOUR_API_KEY_HERE') {
      return {
        isValid: false,
        key: 'placeholder',
        message: 'Using placeholder API key. Please get your real API key from http://api.mediastack.com/'
      };
    }

    return {
      isValid: true,
      key: this.apiKey.substring(0, 8) + '...',
      message: 'MediaStack API key appears to be configured correctly.'
    };
  }

  /**
   * Get current user language
   */
  private getCurrentLanguage(): string {
    return localStorage.getItem('language') || 'en';
  }

  /**
   * Fetch top sports headlines in both English and Russian from backend
   * @param options - Configuration options for the request
   */
  async getTopSportsHeadlinesMultiLanguage(): Promise<MultiLanguageNewsResponse> {
    try {
      // Fetch both English and Russian versions from server
      const [enResponse, ruResponse] = await Promise.all([
        fetch(`${this.backendUrl}/news/sports?language=en`),
        fetch(`${this.backendUrl}/news/sports?language=ru`)
      ]);

      if (enResponse.ok && ruResponse.ok) {
        const [enData, ruData] = await Promise.all([
          enResponse.json(),
          ruResponse.json()
        ]);
        
        return {
          en: enData,
          ru: ruData
        };
      } else {
        throw new Error(`Backend responded with status: EN=${enResponse.status}, RU=${ruResponse.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch multi-language news from backend:', error);
      throw new Error('News service unavailable. Please try again later.');
    }
  }

  /**
   * Fetch top sports headlines in user's preferred language
   * @param options - Configuration options for the request
   */
  async getTopSportsHeadlines() {
    try {
      const language = this.getCurrentLanguage();
      const response = await fetch(`${this.backendUrl}/news/sports?language=${language}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch news from backend:', error);
      throw new Error('News service unavailable. Please try again later.');
    }
  }

  /**
   * Like an article via backend
   */
  async likeArticle(articleId: string): Promise<{ success: boolean; likes: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/news/like/${articleId}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to like article:', error);
    }
    return { success: false, likes: 0 };
  }

  /**
   * Unlike an article via backend
   */
  async unlikeArticle(articleId: string): Promise<{ success: boolean; likes: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/news/unlike/${articleId}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to unlike article:', error);
    }
    return { success: false, likes: 0 };
  }

  /**
   * Get article likes from backend
   */
  async getArticleLikes(articleId: string): Promise<number> {
    try {
      const response = await fetch(`${this.backendUrl}/news/likes/${articleId}`);
      if (response.ok) {
        const data = await response.json();
        return data.likes || 0;
      }
    } catch (error) {
      console.error('Failed to get article likes:', error);
    }
    return 0;
  }

  /**
   * Get transfer news in user's preferred language from backend
   */
  async getTransferNews(sports: string[] = ['football', 'basketball', 'volleyball']): Promise<any> {
    try {
      const language = this.getCurrentLanguage();
      const response = await fetch(`${this.backendUrl}/news/sports?language=${language}`);
      if (response.ok) {
        const data = await response.json();
        // Filter for transfer-related news
        const transferNews = data.data.filter((article: any) => {
          const title = article.title?.toLowerCase() || '';
          const description = article.description?.toLowerCase() || '';
          const content = `${title} ${description}`;
          return sports.some(sport => content.includes(sport) && (content.includes('transfer') || content.includes('trade') || content.includes('signing')));
        });
        return { data: transferNews };
      } else {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch transfer news from backend:', error);
      throw new Error('Transfer news service unavailable. Please try again later.');
    }
  }

  /**
   * Get news in specific language from multi-language response
   */
  getNewsInLanguage(multiLanguageResponse: MultiLanguageNewsResponse, language: string = 'en'): MediaStackResponse {
    return multiLanguageResponse[language as keyof MultiLanguageNewsResponse] || multiLanguageResponse.en;
  }

  /**
   * Get news in current user's language from multi-language response
   */
  getNewsInCurrentLanguage(multiLanguageResponse: MultiLanguageNewsResponse): MediaStackResponse {
    const currentLanguage = this.getCurrentLanguage();
    return this.getNewsInLanguage(multiLanguageResponse, currentLanguage);
  }

  // Helper to decode HTML entities
  private decodeHtmlEntities(text: string): string {
    if (!text) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  /**
   * Convert MediaStack article to Forum post format
   */
  convertToForumPost(article: any, type: 'news' | 'transfer' = 'news'): any {
    const isBreaking = this.isBreakingNews(article.published_at);
    const importance = this.getNewsImportance(article.title, article.description);
    
    // Debug: Log the article data to see what fields are available
    console.log('Article data for conversion:', {
      id: article.id,
      title: article.title,
      image: article.image,
      url: article.url,
      source: article.source
    });
    
    // Decode HTML entities in title and description
    const decodedTitle = this.decodeHtmlEntities(article.title);
    const decodedDescription = this.decodeHtmlEntities(article.description);
    
    return {
      id: article.id || `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: decodedTitle,
      content: decodedDescription || 'No content available',
      author: article.author || article.source,
      authorAvatar: '/images/placeholder-user.jpg',
      timestamp: new Date(article.published_at),
      category: this.extractCategory(decodedTitle),
      sport: this.extractSport(decodedTitle, decodedDescription),
      likes: typeof article.likes === 'number' ? article.likes : 0,
      comments: Math.floor(Math.random() * 50) + 5,
      isLiked: false,
      tags: this.extractTags(decodedTitle, decodedDescription),
      type: type,
      newsDetails: {
        source: article.source,
        importance,
        breaking: isBreaking,
        url: article.url,
        imageUrl: article.image || '/images/sports-arena.jpg' // Fallback image
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
      { name: 'Football', keywords: ['football', 'fifa', 'world cup', 'premier league'] },
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