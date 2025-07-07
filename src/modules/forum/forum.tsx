import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { 
  MessageSquare, 
  Heart, 
  Clock, 
  TrendingUp,
  Newspaper,
  RefreshCw,
  Filter,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Header from '../dashboard/header';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '../../shared/ui/dropdown-menu';
import { newsService } from '../../shared/services/news-service';

// Types for Forum content
interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  timestamp: Date;
  category: string;
  sport: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  tags: string[];
  type: 'debate' | 'news' | 'transfer';
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

const SPORTS = [
  'All Sports',
  'Football',
  'Basketball', 
  'Volleyball',
  'Tennis',
  'Baseball',
  'Soccer',
  'Hockey'
];


export default function Forum() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'debates' | 'news' | 'transfers'>('debates');
  const [selectedSport, setSelectedSport] = useState<string>('All Sports');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredPosts, setFilteredPosts] = useState<ForumPost[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());

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

  // Load news data function (backend only)
  const loadNewsData = async () => {
    try {
      setIsLoading(true);
      setNewsError(null);
      
      // Always get the latest liked articles from localStorage
      const latestLikedArticles = getLikedArticlesFromStorage();
      setLikedArticles(latestLikedArticles);
      
      const allPosts: ForumPost[] = [];

      let newsPosts: ForumPost[] = [];
      let transferPosts: ForumPost[] = [];

      // Fetch news data from backend
      try {
        const newsResponse = await newsService.getTopSportsHeadlines();
        
        // Store news data in localStorage for news detail page (legacy format)
        localStorage.setItem('forumNewsData', JSON.stringify(newsResponse));
        
        newsPosts = newsResponse.data.map((article: any) => {
          const post = newsService.convertToForumPost(article, 'news');
          post.isLiked = latestLikedArticles.has(post.id);
          return post;
        });
      } catch (error) {
        console.error('Error fetching sports headlines:', error);
      }

      // Fetch transfer data from backend
      try {
        const transferResponse = await newsService.getTransferNews(['football', 'basketball', 'volleyball']);
        
        transferPosts = transferResponse.data.map((article: any) => {
          const post = newsService.convertToForumPost(article, 'transfer');
          post.transferDetails = {
            player: 'Various Players',
            fromTeam: 'Multiple Teams',
            toTeam: 'Various Destinations',
            status: 'rumor' as const
          };
          post.isLiked = latestLikedArticles.has(post.id);
          return post;
        });
      } catch (error) {
        console.error('Error fetching transfer news:', error);
      }

      // Add posts to allPosts array
      allPosts.push(...newsPosts, ...transferPosts);

      // Add some mock debate posts since NewsAPI doesn't have debate content
      const mockDebates: ForumPost[] = [
        {
          id: 'debate-1',
          title: 'Who is the Greatest Basketball Player of All Time?',
          content: 'The eternal debate continues! Is it Michael Jordan with his 6 championships, or LeBron James with his longevity and all-around dominance?',
          author: 'SportsDebater',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          category: 'GOAT Debate',
          sport: 'Basketball',
          likes: 234,
          comments: 89,
          isLiked: false,
          tags: ['GOAT', 'Jordan', 'LeBron'],
          type: 'debate',
          debateDetails: {
            option1: 'Michael Jordan',
            option2: 'LeBron James',
            votes: 1567,
            trending: true
          }
        } as DebatePost,
        {
          id: 'debate-2',
          title: 'Should the NFL Expand the Playoff Format?',
          content: 'With the current 14-team playoff format, is it time to expand further or keep it as is?',
          author: 'NFLFanatic',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          category: 'NFL Rules',
          sport: 'Football',
          likes: 156,
          comments: 43,
          isLiked: true,
          tags: ['NFL', 'Playoffs', 'Format'],
          type: 'debate',
          debateDetails: {
            option1: 'Expand Playoffs',
            option2: 'Keep Current Format',
            votes: 743,
            trending: false
          }
        } as DebatePost,
        {
          id: 'debate-3',
          title: 'Is the Transfer Portal Ruining College Sports?',
          content: 'With players constantly switching teams, are we losing the traditional college sports experience?',
          author: 'CollegeFan',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
          category: 'College Sports',
          sport: 'Football',
          likes: 98,
          comments: 67,
          isLiked: false,
          tags: ['College', 'Transfer', 'Portal'],
          type: 'debate',
          debateDetails: {
            option1: 'Yes, it\'s ruining tradition',
            option2: 'No, it gives players freedom',
            votes: 432,
            trending: true
          }
        } as DebatePost
      ];

      allPosts.push(...mockDebates);
      setPosts(allPosts);
      
    } catch (error) {
      console.error('Error loading forum data:', error);
      setNewsError('Failed to load latest news. Please try again later.');
      
      // Fallback to mock data if API fails
      const fallbackPosts: ForumPost[] = [
        {
          id: 'fallback-1',
          title: 'Unable to Load Latest News',
          content: 'We\'re experiencing issues connecting to our news service. Please check your internet connection and try again.',
          author: 'System',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(),
          category: 'System Message',
          sport: 'General Sports',
          likes: 0,
          comments: 0,
          isLiked: false,
          tags: ['System'],
          type: 'news',
          newsDetails: {
            source: 'System',
            importance: 'medium',
            breaking: false
          }
        } as NewsPost
      ];
      setPosts(fallbackPosts);
    } finally {
      setIsLoading(false);
    }
  };

  // Load real news data with caching
  useEffect(() => {
    loadNewsData().catch(error => {
      console.error('Error in loadNewsData:', error);
    });
  }, []);

  // Filter and sort posts
  useEffect(() => {
    let filtered = posts.filter(post => {
      const matchesTab = post.type === activeTab;
      const matchesSport = selectedSport === 'All Sports' || post.sport === selectedSport;
      return matchesTab && matchesSport;
    });


    setFilteredPosts(filtered);
  }, [posts, activeTab, selectedSport]);

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const handlePostClick = (post: ForumPost) => {
    if (post.type === 'debate') {
      navigate(`/forum/debates/${post.id}`);
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
      
      // Clear existing posts and reload from backend
      setPosts([]);
      await loadNewsData();
    } catch (error) {
      console.error('Error refreshing news:', error);
      setNewsError('Failed to refresh news. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const PostCard = ({ post }: { post: ForumPost }) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={post.authorAvatar} 
              alt={post.author}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-primary/20"
            />
            <div>
              <p className="font-semibold text-xs sm:text-sm">{post.author}</p>
              <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(post.timestamp)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-xs">
              <span className="hidden sm:inline">{post.sport}</span>
              <span className="sm:hidden">{post.sport.length > 8 ? post.sport.substring(0, 8) + '...' : post.sport}</span>
            </Badge>
            {post.type === 'news' && (post as NewsPost).newsDetails.breaking && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                <span className="hidden sm:inline">BREAKING</span>
                <span className="sm:hidden">BREAK</span>
              </Badge>
            )}
            {post.type === 'debate' && (post as DebatePost).debateDetails.trending && (
              <Badge variant="default" className="text-xs bg-orange-500">
                <span className="hidden sm:inline">TRENDING</span>
                <span className="sm:hidden">TREND</span>
              </Badge>
            )}
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
      
      <CardContent className="space-y-3 p-4 sm:p-6" onClick={() => handlePostClick(post)}>
        <div>
          <h3 className="font-bold text-base sm:text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Vote count:</span>
              <span className="font-semibold">{(post as DebatePost).debateDetails.votes} votes</span>
            </div>
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

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {post.type === 'debate' ? (
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{post.comments}</span>
                <span className="sm:hidden">{post.comments}</span>
              </div>
            </div>
          ) : <span />}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleLike(post.id);
            }}
            className={`hover:scale-105 transition-all ${
              post.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
            }`}
            disabled={post.isLiked}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm">{post.likes}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading Forum...</span>
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sports Forum</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Join the discussion on debates, latest news, and transfer updates
            </p>
            {newsError && (
              <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs sm:text-sm rounded-md">
                {newsError}
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="debates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Debates</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Newspaper className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Transfers</span>
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
                      onClick={() => setSelectedSport(sport)}
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
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No debates found</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to start a debate in {selectedSport === 'All Sports' ? 'any sport' : selectedSport}!
                  </p>
                  <Button onClick={handleCreateDebate}>
                    Start a Debate
                  </Button>
                </Card>
              )}
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
                      {(post as NewsPost).newsDetails.imageUrl && (
                        <img
                          src={(post as NewsPost).newsDetails.imageUrl}
                          alt={post.title}
                          className="w-full h-48 sm:h-64 object-contain object-top rounded-lg mb-4"
                          onError={e => (e.currentTarget.src = '/images/sports-arena.jpg')}
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs sm:text-sm">{post.sport}</Badge>
                        <Badge variant="outline" className="text-xs sm:text-sm">{post.category}</Badge>
                      </div>
                      <div className="text-muted-foreground text-xs mb-2">
                        <span>By {post.author}</span>
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
                        {(post as NewsPost).newsDetails.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(post as NewsPost).newsDetails.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Read Original</span>
                              <span className="sm:hidden">Original</span>
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
                  <h3 className="text-lg font-semibold mb-2">No news found</h3>
                  <p className="text-muted-foreground mb-4">
                    No recent news for {selectedSport === 'All Sports' ? 'any sport' : selectedSport}.
                  </p>
                  <Button onClick={handleRefreshNews}>
                    Refresh News
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <div className="grid gap-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No transfers found</h3>
                  <p className="text-muted-foreground mb-4">
                    No recent transfer updates for {selectedSport === 'All Sports' ? 'any sport' : selectedSport}.
                  </p>
                  <Button onClick={handleRefreshNews}>
                    Refresh Transfers
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