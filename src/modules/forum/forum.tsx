import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { 
  MessageSquare, 
  Heart, 
  Newspaper,
  RefreshCw,
  Filter,
  ChevronRight,
  ExternalLink,
  TrendingUp,

} from 'lucide-react';
import Header from '../dashboard/header';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '../../shared/ui/dropdown-menu';
import { newsService } from '../../shared/services/news-service';
import { debateService, type DebatePick } from '../../shared/services/debate-service';
import { transferService, type Transfer } from '../../shared/services/transfer-service';
import { useGlobalStore } from '../../shared/interface/gloabL_var';
import { useTranslation } from 'react-i18next';

// Types for Forum content
interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  timestamp: Date;
  sport: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  tags: string[];
  type: 'debate' | 'news' | 'transfer';
  debateDetails?: {
    option1: string;
    option2: string;
    votes: number;
    trending: boolean;
  };
  transferDetails?: {
    player: string;
    fromTeam: string;
    toTeam: string;
    fee?: string;
    status: 'rumor' | 'confirmed' | 'completed';
  };
  newsDetails?: {
    source: string;
    importance: 'low' | 'medium' | 'high';
    breaking: boolean;
    imageUrl?: string;
    url?: string;
  };
}

interface TransferPost extends ForumPost {
  type: 'transfer';
  transferDetails: {
    player: string;
    fromTeam: string;
    toTeam: string;
    fee?: string;
    status: 'rumor' | 'confirmed' | 'completed';
  };
}

interface NewsPost extends ForumPost {
  type: 'news';
  newsDetails: {
    source: string;
    importance: 'low' | 'medium' | 'high';
    breaking: boolean;
    imageUrl?: string;
    url?: string;
  };
}

interface DebatePost extends ForumPost {
  type: 'debate';
  debateDetails: {
    option1: string;
    option2: string;
    votes: number;
    trending: boolean;
  };
}
export default function Forum() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGlobalStore();
  
  // Consolidate ALL state hooks at the top
  const [activeTab, setActiveTab] = useState<'debates' | 'news' | 'transfers'>('debates');
  const [selectedSport, setSelectedSport] = useState<string>(t('forum.allSports'));
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [debates, setDebates] = useState<DebatePick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newsError, setNewsError] = useState<string | null>(null);
  const [debateError, setDebateError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());

  // Refs and other hooks
  const normalizeSportName = useCallback((sport: string) => {
    const normalizedSport = sport.toLowerCase().trim();
    const sportMappings: {[key: string]: string} = {
      'soccer': 'football',
      'football': 'football',
      'basketball': 'basketball',
      'volleyball': 'volleyball',
      'tennis': 'tennis',
      'baseball': 'baseball',
      'hockey': 'hockey'
    };
    return sportMappings[normalizedSport] || normalizedSport;
  }, []);

  const SPORTS = useMemo(() => [
    t('forum.allSports'),
    t('forum.football'),
    t('forum.basketball'), 
    t('forum.volleyball'),
    t('forum.tennis'),
    t('forum.baseball'),
    t('forum.soccer'),
    t('forum.hockey')
  ], [t]);

  // Helper to load liked articles from localStorage
  const getLikedArticlesFromStorage = (): Set<string> => {
    try {
      const stored = localStorage.getItem('likedArticles');
      if (stored) {
        return new Set<string>(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading liked articles:', error);
    }
    return new Set<string>();
  };

  // Save liked articles to localStorage
  const saveLikedArticles = (likedIds: Set<string>) => {
    try {
      localStorage.setItem('likedArticles', JSON.stringify(Array.from(likedIds)));
    } catch (error) {
      console.error('Error saving liked articles:', error);
    }
  };

  // Add a function to get sport-specific image
  const getSportImage = (): string => {
    // Always return sports-arena.jpg regardless of sport
    return '/images/sports-arena.jpg';
  };

  // Modify mock news generation function
  const generateMockNews = (): ForumPost[] => {
    const mockNewsList: ForumPost[] = [
      {
        id: 'mock-news-1',
        title: 'Historic Comeback in Champions League',
        content: 'In an unprecedented match, underdog team overcomes 3-goal deficit to win in the final minutes. Fans and experts alike are calling it one of the most remarkable turnarounds in recent football history.',
        author: 'Sports Insider',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(),
        sport: 'Football',
        likes: 256,
        comments: 42,
        isLiked: false,
        tags: ['Champions League', 'Football', 'Comeback'],
        type: 'news',
        newsDetails: {
          source: 'Sports Insider',
          importance: 'high',
          breaking: true,
          imageUrl: getSportImage(),
          url: '#'
        }
      },
      {
        id: 'mock-news-2',
        title: 'Basketball Star Sets New Scoring Record',
        content: 'In a breathtaking performance, young basketball prodigy breaks the all-time scoring record, surpassing legends of the game. Analysts predict a bright future for this emerging talent.',
        author: 'Basketball Weekly',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(),
        sport: 'Basketball',
        likes: 189,
        comments: 27,
        isLiked: false,
        tags: ['Basketball', 'Record', 'NBA'],
        type: 'news',
        newsDetails: {
          source: 'Basketball Weekly',
          importance: 'medium',
          breaking: false,
          imageUrl: getSportImage(),
          url: '#'
        }
      },
      {
        id: 'mock-news-3',
        title: 'Tennis Grand Slam Shocker',
        content: 'Unexpected upset in the Grand Slam tournament as the world number one is eliminated in a stunning match. The tennis world is buzzing with discussions about this surprising turn of events.',
        author: 'Tennis Insider',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(),
        sport: 'Tennis',
        likes: 134,
        comments: 19,
        isLiked: false,
        tags: ['Tennis', 'Grand Slam', 'Upset'],
        type: 'news',
        newsDetails: {
          source: 'Tennis Insider',
          importance: 'high',
          breaking: true,
          imageUrl: getSportImage(),
          url: '#'
        }
      },
      {
        id: 'mock-news-4',
        title: 'Hockey Team Wins Championship After 20-Year Drought',
        content: 'In an emotional victory, the hometown hockey team clinches the championship, ending a 20-year title drought. The city erupts in celebration as fans witness a historic moment.',
        author: 'Hockey Times',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(),
        sport: 'Hockey',
        likes: 221,
        comments: 35,
        isLiked: false,
        tags: ['Hockey', 'Championship', 'Victory'],
        type: 'news',
        newsDetails: {
          source: 'Hockey Times',
          importance: 'high',
          breaking: true,
          imageUrl: getSportImage(),
          url: '#'
        }
      }
    ];

    return mockNewsList;
  };

  // Modify loadData method to include mock news
  const loadData = async () => {
    try {
      setIsLoading(true);
      setNewsError(null);
      setDebateError(null);
      setTransferError(null);
      
      // Always get the latest liked articles from localStorage
      const latestLikedArticles = getLikedArticlesFromStorage();
      setLikedArticles(latestLikedArticles);
      
      const allPosts: ForumPost[] = [];

      let newsPosts: ForumPost[] = [];
      let transferPosts: ForumPost[] = [];

      // Fetch debates from backend only if user is authenticated
      if (user && user.username && localStorage.getItem('access_token')) {
        try {
          const debateData = await debateService.getDebates({ 
            limit: 50,
            sortBy: 'latest'
          });
          setDebates(debateData);
        } catch (error: any) {
          console.error('Error fetching debates:', error);
          if (error.message?.includes('Authorization header missing') || error.message?.includes('401')) {
            setDebateError('Please log in to view debates');
          } else {
            setDebateError('Failed to load debates');
          }
        }
      } else {
        setDebateError('Please log in to view debates');
      }

      // Fetch multi-language news data from server
      try {
        const multiLanguageNewsResponse = await newsService.getTopSportsHeadlinesMultiLanguage();
        
        // Get news in current user's language
        const currentLanguage = localStorage.getItem('language') || 'en';
        const newsResponse = newsService.getNewsInLanguage(multiLanguageNewsResponse, currentLanguage);
        
        // Store multi-language news data in localStorage for news detail page
        localStorage.setItem('forumNewsData', JSON.stringify(multiLanguageNewsResponse));
        
        newsPosts = newsResponse.data.map((article: any) => {
          const post = newsService.convertToForumPost(article, 'news');
          post.isLiked = latestLikedArticles.has(post.id);
          return post;
        });

        // If no news found, use mock news
        if (newsPosts.length === 0) {
          console.warn('No news found. Using mock news.');
          newsPosts = generateMockNews();
        }
      } catch (error) {
        console.error('Error fetching sports headlines:', error);
        
        // Fallback to mock news if fetching fails
        newsPosts = generateMockNews();
      }

      // Fetch transfer data from server
      try {
        const transferResponse = await transferService.getTransfers();
        
        transferPosts = transferResponse.map((transfer: Transfer) => {
          const post: ForumPost = {
            id: `transfer-${transfer.player_id}`,
            title: `${transfer.player_name}`,
            content: `${transfer.player_name} moved from ${transfer.from_team} to ${transfer.to_team}`,
            author: 'Transfer News',
            authorAvatar: '/images/placeholder-user.jpg',
            timestamp: new Date(transfer.transfer_date || new Date()),
            sport: 'Football',
            likes: 0, // No likes for transfers
            comments: 0,
            isLiked: false,
            tags: ['Football', 'Transfer'],
            type: 'transfer' as const,
            transferDetails: {
              player: transfer.player_name,
              fromTeam: transfer.from_team,
              toTeam: transfer.to_team,
              fee: transferService.formatTransferFee(transfer),
              status: (transfer.transfer_type.toLowerCase() === 'loan' ? 'confirmed' : 'completed') as 'rumor' | 'confirmed' | 'completed'
            }
          };
          return post;
        });
        
      } catch (error: any) {
        console.error('Error fetching transfer news:', error);
        if (error.message?.includes('Authentication required')) {
          setTransferError('Please log in to view transfers');
        } else if (error.message?.includes('temporarily unavailable')) {
          setTransferError('Transfer service is temporarily unavailable. Please try again later.');
        } else {
          setTransferError('Failed to load transfer news');
        }
      }

      // Combine all posts
      allPosts.push(...newsPosts, ...transferPosts);
      setPosts(allPosts);
      
    } catch (error) {
      console.error('Error loading forum data:', error);
      setNewsError(t('forum.failedToLoadNews'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load data with caching
  useEffect(() => {
    loadData().catch((error: any) => {
      console.error('Error in loadData:', error);
    });
  }, [user]); // Re-run when user changes

  // Load debates separately to ensure they're always fetched when user is authenticated
  useEffect(() => {
    const loadDebates = async () => {
      if (user && user.username && localStorage.getItem('access_token')) {
        try {
          console.log('Loading debates for user:', user.username);
          const debateData = await debateService.getDebates({ 
            limit: 50,
            sortBy: 'latest'
          });
          console.log('Loaded debates:', debateData);
          setDebates(debateData);
          setDebateError(null);
        } catch (error: any) {
          console.error('Error fetching debates:', error);
          const errorMessage = error.message || 'Failed to load debates';
          
          if (errorMessage.includes('Authorization') || errorMessage.includes('401')) {
            setDebateError('Please log in to view debates');
          } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
            setDebateError('Network error. Please check your connection.');
          } else {
            setDebateError(errorMessage);
          }
          
          setDebates([]);
        }
      } else {
        setDebateError('Please log in to view debates');
        setDebates([]);
      }
    };

    // Immediate load
    loadDebates();

    // Periodic refresh every 5 minutes
    const intervalId = setInterval(loadDebates, 5 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [user, user?.username]);




  const handlePostClick = (post: ForumPost) => {
    if (post.type === 'debate') {
      navigate(`/selection/${post.id}`);
    } else if (post.type === 'news' || post.type === 'transfer') {
      // No need to set selectedNews here, as we'll render the detail view directly in the list
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      let result;
      let newLikedArticles = new Set(likedArticles);
      if (post.isLiked) {
        result = await newsService.unlikeArticle(postId);
        newLikedArticles.delete(postId);
      } else {
        result = await newsService.likeArticle(postId);
        newLikedArticles.add(postId);
      }
      saveLikedArticles(newLikedArticles);
      setLikedArticles(newLikedArticles);
      
      if (result.success) {
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                isLiked: newLikedArticles.has(postId),
                likes: result.likes
              }
            : { ...p, isLiked: newLikedArticles.has(p.id) }
        ));
      }
    } catch (error) {
      console.error('Error handling like:', error);
      // Fallback to local state if backend fails
      let newLikedArticles = new Set(likedArticles);
      const currentPost = posts.find(p => p.id === postId);
      if (currentPost?.isLiked) {
        newLikedArticles.delete(postId);
      } else {
        newLikedArticles.add(postId);
      }
      saveLikedArticles(newLikedArticles);
      setLikedArticles(newLikedArticles);
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              isLiked: newLikedArticles.has(postId),
              likes: p.isLiked ? p.likes - 1 : p.likes + 1 
            }
          : { ...p, isLiked: newLikedArticles.has(p.id) }
      ));
    }
  };

  const handleCreateDebate = () => {
    navigate('/forum/debates/create');
  };

  const handleRefreshNews = async () => {
    try {
      setIsLoading(true);
      setNewsError(null);
      setDebateError(null);
      setTransferError(null);
      
      // Refresh all data
      await loadData();
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      setNewsError(t('forum.failedToRefreshNews'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshDebates = async () => {
    try {
      setIsLoading(true);
      setDebateError(null);
      
      if (user && user.username && localStorage.getItem('access_token')) {
        console.log('Refreshing debates for user:', user.username);
        const debateData = await debateService.getDebates({ 
          limit: 50,
          sortBy: 'latest'
        });
        console.log('Refreshed debates:', debateData);
        
        // Ensure we always update, even if data is empty
        setDebates(debateData);
        
        // If no debates found, set an informative message
        if (debateData.length === 0) {
          setDebateError(t('forum.noDebatesFound'));
        }
      } else {
        setDebateError('Please log in to view debates');
        setDebates([]);
      }
    } catch (error: any) {
      console.error('Error refreshing debates:', error);
      const errorMessage = error.message || 'Failed to refresh debates';
      
      if (errorMessage.includes('Authorization') || errorMessage.includes('401')) {
        setDebateError('Please log in to view debates');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setDebateError('Network error. Please check your connection.');
      } else {
        setDebateError(errorMessage);
      }
      
      setDebates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTransfers = async () => {
    try {
      setIsLoading(true);
      setTransferError(null);
      
      const transferResponse = await transferService.getTransfers();
      const transferPosts = transferResponse.map((transfer: Transfer): ForumPost => ({
        id: `transfer-${transfer.player_id}`,
        title: `${transfer.player_name} Transfer`,
        content: `${transfer.player_name} moved from ${transfer.from_team} to ${transfer.to_team}${transfer.fee ? ` for ${transfer.fee}` : ''}`,
        author: 'Transfer News',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(transfer.transfer_date || new Date()),
        sport: 'Football',
        likes: 0,
        comments: 0,
        isLiked: false,
        tags: [],
        type: 'transfer' as const,
        transferDetails: {
          player: transfer.player_name,
          fromTeam: transfer.from_team,
          toTeam: transfer.to_team,
          fee: transferService.formatTransferFee(transfer),
          status: (transfer.transfer_type.toLowerCase() === 'loan' ? 'confirmed' : 'completed') as 'rumor' | 'confirmed' | 'completed'
        }
      }));
      
      // Update only transfer posts in the existing posts array
      setPosts(prevPosts => {
        const nonTransferPosts = prevPosts.filter(post => post.type !== 'transfer');
        return [...nonTransferPosts, ...transferPosts];
      });
      
    } catch (error: any) {
      console.error('Error refreshing transfers:', error);
      if (error.message?.includes('Authentication required')) {
        setTransferError('Please log in to view transfers');
      } else if (error.message?.includes('temporarily unavailable')) {
        setTransferError('Transfer service is temporarily unavailable. Please try again later.');
      } else {
        setTransferError('Failed to refresh transfer news');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh content when language changes
  useEffect(() => {
    const handleLanguageChange = async () => {
      try {
        setIsLoading(true);
        setNewsError(null);
        setDebateError(null);
        setTransferError(null);
        
        // Always refresh news and transfers
        const multiLanguageNewsResponse = await newsService.getTopSportsHeadlinesMultiLanguage();
        
        // Get news in current user's language
        const currentLanguage = localStorage.getItem('language') || 'en';
        const newsResponse = newsService.getNewsInLanguage(multiLanguageNewsResponse, currentLanguage);
        
        // Convert news to forum posts
        const newPosts = newsResponse.data.map((article: any) => {
          const post = newsService.convertToForumPost(article, 'news');
          post.isLiked = likedArticles.has(post.id);
          return post;
        });
        
        // Fetch fresh transfer data
        const transferResponse = await transferService.getTransfers();
        const transferPosts = transferResponse.map((transfer: Transfer): ForumPost => ({
          id: `transfer-${transfer.player_id}`,
          title: `${transfer.player_name} Transfer`,
          content: `${transfer.player_name} moved from ${transfer.from_team} to ${transfer.to_team}${transfer.fee ? ` for ${transfer.fee}` : ''}`,
          author: 'Transfer News',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(transfer.transfer_date || new Date()),
          sport: 'Football',
          likes: 0,
          comments: 0,
          isLiked: false,
          tags: ['Football', 'Transfer'],
          type: 'transfer' as const,
          transferDetails: {
            player: transfer.player_name,
            fromTeam: transfer.from_team,
            toTeam: transfer.to_team,
            fee: transferService.formatTransferFee(transfer),
            status: (transfer.transfer_type.toLowerCase() === 'loan' ? 'confirmed' : 'completed') as 'rumor' | 'confirmed' | 'completed'
          }
        }));
        
        // Update posts with both news and transfers
        setPosts([...newPosts, ...transferPosts]);

        // Refresh debates if user is authenticated
        if (user && user.username && localStorage.getItem('access_token')) {
          const debateData = await debateService.getDebates({ 
            limit: 50,
            sortBy: 'latest'
          });
          setDebates(debateData);
        }
      } catch (error) {
        console.error('Error during language change refresh:', error);
        setNewsError(t('forum.failedToRefreshNews'));
        setDebateError(t('forum.failedToLoadNews'));
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for language changes
    window.addEventListener('languageChange', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, [user, likedArticles, t]);

  const PostCard = ({ post }: { post: ForumPost }) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-xs">
              <span className="hidden sm:inline">{post.sport}</span>
              <span className="sm:hidden">{post.sport.length > 8 ? post.sport.substring(0, 8) + '...' : post.sport}</span>
            </Badge>

            {post.type === 'transfer' && (
              <Badge 
                variant={
                  (post as TransferPost).transferDetails.status === 'confirmed' ? 'default' :
                  (post as TransferPost).transferDetails.status === 'rumor' ? 'secondary' : 'outline'
                }
                className="text-xs"
              >
                <span className="hidden sm:inline">{(post as TransferPost).transferDetails.status.toUpperCase()}</span>
                <span className="sm:hidden">{(post as TransferPost).transferDetails.status.substring(0, 3).toUpperCase()}</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 p-4 sm:p-5" onClick={() => handlePostClick(post)}>
        <div>
          <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-3">
            {post.content}
          </p>
        </div>

        {/* Type-specific content */}
        {post.type === 'transfer' && (
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate mr-2">{(post as TransferPost).transferDetails.player}</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {(post as TransferPost).transferDetails.fromTeam} → {(post as TransferPost).transferDetails.toTeam}
              {(post as TransferPost).transferDetails.fee && (
                <span className="ml-1 sm:ml-2">({(post as TransferPost).transferDetails.fee})</span>
              )}
            </div>
          </div>
        )}

        {post.type === 'debate' && (
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
            {/* Vote bar visualization */}
            {(() => {
              const details = (post as DebatePost).debateDetails;
              const totalVotes = details.votes || 0;
              
              // For real debates, we need to get the actual vote counts from the debate data
              const debate = debates.find(d => d.id === post.id);
              if (debate) {
                const votes1 = debate.option1_votes;
                const votes2 = debate.option2_votes;
                const total = votes1 + votes2;
                const percent1 = total > 0 ? Math.round((votes1 / total) * 100) : 50;
                const percent2 = total > 0 ? 100 - percent1 : 50;
                
                return (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{details.option1} ({percent1}%)</span>
                      <span className="font-medium">{details.option2} ({percent2}%)</span>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${percent1}%`, transition: 'width 0.3s' }}
                      />
                      <div
                        className="bg-secondary h-full"
                        style={{ width: `${percent2}%`, transition: 'width 0.3s' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{votes1} {t('forum.votes')}</span>
                      <span>{votes2} {t('forum.votes')}</span>
                    </div>
                  </div>
                );
              }
              
              // Fallback for when debate data is not available
              const votes1 = totalVotes ? Math.round(totalVotes * 0.6) : 0;
              const votes2 = totalVotes - votes1;
              const percent1 = totalVotes ? Math.round((votes1 / totalVotes) * 100) : 0;
              const percent2 = totalVotes ? 100 - percent1 : 0;
              
              return (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{details.option1} ({percent1}%)</span>
                    <span className="font-medium">{details.option2} ({percent2}%)</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${percent1}%`, transition: 'width 0.3s' }}
                    />
                    <div
                      className="bg-secondary h-full"
                      style={{ width: `${percent2}%`, transition: 'width 0.3s' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{votes1} {t('forum.votes')}</span>
                    <span>{votes2} {t('forum.votes')}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              <span className="hidden sm:inline">#{tag}</span>
              <span className="sm:hidden">#{tag.length > 6 ? tag.substring(0, 6) + '...' : tag}</span>
            </Badge>
          ))}
          {post.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              <span className="hidden sm:inline">+{post.tags.length - 3} more</span>
              <span className="sm:hidden">+{post.tags.length - 3}</span>
            </Badge>
          )}
        </div>


        {post.type === 'news' && (post as NewsPost).newsDetails && (post as NewsPost).newsDetails.url && (
          <Button variant="outline" size="sm" asChild>
            <a href={(post as NewsPost).newsDetails.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('forum.readOriginal')}</span>
              <span className="sm:hidden">{t('forum.original')}</span>
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  // Modify the transfers rendering logic
  const TransferCard = ({ post }: { post: ForumPost }) => {
    if (post.type !== 'transfer' || !post.transferDetails) {
      return null;
    }
    
    return (
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <Badge 
              variant={
                post.transferDetails.status === 'confirmed' ? 'default' :
                post.transferDetails.status === 'rumor' ? 'secondary' : 'outline'
              } 
              className="text-xs"
            >
              {post.transferDetails.status.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {post.sport}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2 p-4 sm:p-5">
          <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {post.transferDetails.fromTeam} → {post.transferDetails.toTeam}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Use only real posts from API
  const allPosts = posts;

  const filteredPosts = useMemo(() => {
    if (activeTab === 'debates') {
      // Handle debates separately
      const normalizedSelectedSport = normalizeSportName(selectedSport);
      const isAllSports = normalizedSelectedSport === normalizeSportName(t('forum.allSports'));
      
      let filteredDebates = debates.filter(debate => {
        const normalizedDebateSport = normalizeSportName(debate.category);
        return isAllSports || normalizedDebateSport === normalizedSelectedSport;
      });

      // Convert debates to ForumPost format
      return filteredDebates.map(debate => ({
        id: debate.id,
        title: `${debate.option1_name} vs ${debate.option2_name}`,
        content: debate.option1_description || debate.option2_description || '',
        author: 'System',
        authorAvatar: '/images/placeholder-user.jpg',
        timestamp: new Date(debate.created_at),
        sport: debate.category,
        likes: debate.option1_votes + debate.option2_votes,
        comments: 0,
        isLiked: false,
        tags: [debate.category],
        type: 'debate' as const,
        debateDetails: {
          option1: debate.option1_name,
          option2: debate.option2_name,
          votes: debate.option1_votes + debate.option2_votes,
          trending: debateService.isTrending(debate)
        }
      }));
    }

    // Handle news and transfers
    return allPosts.filter(post => {
      // Filter by sport
      if (selectedSport !== t('forum.allSports') && post.sport !== selectedSport) {
        return false;
      }
      
      // Filter by tab
      if (activeTab === 'news' && post.type !== 'news') return false;
      if (activeTab === 'transfers' && post.type !== 'transfer') return false;
      
      return true;
    });
  }, [allPosts, debates, selectedSport, activeTab, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">{t('forum.loadingForum')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('forum.sportsForum')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('forum.joinDiscussion')}
            </p>
            {newsError && (
              <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs sm:text-sm rounded-md">
                {newsError}
              </div>
            )}
            {debateError && (
              <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs sm:text-sm rounded-md">
                {debateError}
              </div>
            )}
            {transferError && (
              <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs sm:text-sm rounded-md">
                {transferError}
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="debates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('forum.debates')}
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Newspaper className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('forum.news')}
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('forum.transfers')}
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Sport Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{selectedSport}</span>
                    <span className="sm:hidden">{selectedSport.length > 10 ? selectedSport.substring(0, 10) + '...' : selectedSport}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {SPORTS.map(sport => (
                    <DropdownMenuItem 
                      key={sport}
                      onClick={() => {
                        const normalizedSport = sport === t('forum.allSports') 
                          ? t('forum.allSports') 
                          : normalizeSportName(sport);
                        setSelectedSport(normalizedSport);
                      }}
                      className={selectedSport === sport ? 'bg-accent' : ''}
                    >
                      {sport}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="debates" className="space-y-4">
            <div className="grid gap-6">
              {(() => {
                console.log('Rendering debates - Filtered Posts:', filteredPosts);
                return filteredPosts.length > 0 ? (
                  filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">{t('forum.noDebatesFound')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('forum.beFirstToStartDebate', { sport: selectedSport === t('forum.allSports') ? t('forum.anySport') : selectedSport })}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={handleRefreshDebates} disabled={isLoading}>
                        {isLoading ? t('forum.loadingForum') : t('forum.refreshDebates')}
                      </Button>
                      <Button onClick={handleCreateDebate}>
                        {t('forum.createDebateButton')}
                      </Button>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            <div className="grid gap-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <div key={post.id} className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-auto mb-8 overflow-y-auto">
                    <div className="flex justify-between items-center p-4 border-b">
                      <h2 className="text-lg font-bold">{post.title}</h2>
                    </div>
                    <div className="p-4 space-y-4">
                      {post.type === 'news' && (post as NewsPost).newsDetails && (post as NewsPost).newsDetails.imageUrl && (
                        <img
                          src={(post as NewsPost).newsDetails.imageUrl}
                          alt={post.title}
                          className="w-full h-48 sm:h-64 object-contain object-top rounded-lg mb-4"
                          onError={e => (e.currentTarget.src = '/images/sports-arena.jpg')}
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs sm:text-sm">{post.sport}</Badge>
                      </div>
                      <div className="text-muted-foreground text-xs mb-2">
                        <span>{t('forum.by')} {post.author}</span>
                      </div>
                      <div className="prose prose-gray max-w-none mb-4">
                        <div className="space-y-3 sm:space-y-4 text-foreground leading-relaxed text-sm sm:text-base">
                          {post.content.split('\n\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className={`hover:scale-105 transition-all ${post.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
                          disabled={post.isLiked}
                        >
                          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{post.likes}</span>
                        </Button>
                        {post.type === 'news' && (post as NewsPost).newsDetails && (post as NewsPost).newsDetails.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(post as NewsPost).newsDetails.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">{t('forum.readOriginal')}</span>
                              <span className="sm:hidden">{t('forum.original')}</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Card className="p-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('forum.noNewsFound')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('forum.noRecentNews', { sport: selectedSport === t('forum.allSports') ? t('forum.anySport') : selectedSport })}
                  </p>
                  <Button onClick={handleRefreshNews}>
                    {t('forum.refreshNews')}
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <div className="grid gap-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <TransferCard key={post.id} post={post} />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('forum.transferNews.noTransfersFound')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('forum.transferNews.noRecentTransfers')}
                  </p>
                  <Button onClick={handleRefreshTransfers}>
                    {t('forum.transferNews.refreshTransfers')}
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
} 