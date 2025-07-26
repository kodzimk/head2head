import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { CompetitiveInput } from '../../shared/ui/input';
import { UserAvatar } from '../../shared/ui/user-avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import Header from '../dashboard/header';
import type { User, Friend } from '../../shared/interface/user';
import { API_BASE_URL } from '../../shared/config';
import AvatarStorage from '../../shared/utils/avatar-storage';
import ChatInterface from './chat';
import axios from 'axios';

interface ChatPreview {
  friend: Friend;
  lastMessage: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
    senderId: string;
  } | null;
  unreadCount: number;
}

export default function ChatsPage({ user }: { user: User }) {
  const { username: urlUsername } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

  // Enhanced avatar fetching function with caching
  const fetchFriendDataWithAvatar = async (friendUsername: string): Promise<Friend> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`);
      
      // Enhanced avatar handling with caching
      let avatarUrl = null;
      if (response.data.avatar) {
        // Check for persistent avatar first
        const persistentAvatar = await AvatarStorage.getAvatar(friendUsername);
        if (persistentAvatar === null) {
          // Cache server avatar locally for faster future access
          try {
            const fullAvatarUrl = response.data.avatar.startsWith('http') 
              ? response.data.avatar 
              : `${API_BASE_URL}${response.data.avatar}`;
            
            // Fetch and cache the server avatar
            const avatarResponse = await fetch(fullAvatarUrl);
            if (avatarResponse.ok) {
              const blob = await avatarResponse.blob();
              const file = new File([blob], 'avatar.jpg', { type: blob.type });
              await AvatarStorage.saveAvatar(friendUsername, file);
              console.log('[Chat Page] Cached server avatar for', friendUsername);
            }
          } catch (error) {
            console.warn('[Chat Page] Failed to cache server avatar:', error);
          }
        }
        avatarUrl = response.data.avatar.startsWith('http') 
          ? response.data.avatar 
          : `${API_BASE_URL}${response.data.avatar}`;
      }
      
      return {
        username: response.data.username,
        status: "",
        avatar: avatarUrl,
        rank: response.data.ranking.toString()
      };
    } catch (error) {
      console.error("Error fetching friend data:", error);
      return {
        username: friendUsername,
        status: "",
        avatar: null,
        rank: "0"
      };
    }
  };

  // Check if the URL username is a valid friend
  useEffect(() => {
    if (urlUsername && friends.length > 0) {
      const matchedFriend = friends.find(f => f.username === urlUsername);
      if (matchedFriend) {
        setActiveChatFriend(matchedFriend);
      } else {
        // If username is not a valid friend, reset active chat
        setActiveChatFriend(null);
      }
    }
  }, [urlUsername, friends]);

  // Prevent random redirects during language switch
  useEffect(() => {
    if (urlUsername && (!friends.length || !friends.some(f => f.username === urlUsername))) {
      // If friends list is empty or username is not a valid friend, 
      // reset to default chats view
      setActiveChatFriend(null);
    }
  }, [urlUsername, friends]);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user.friends || user.friends.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      try {
        const friendPromises = user.friends.map(friendUsername => 
          fetchFriendDataWithAvatar(friendUsername)
        );
        
        const friendsData = await Promise.all(friendPromises);
        setFriends(friendsData);
        
        // After getting friends, fetch chat previews
        await fetchChatPreviews(friendsData);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFriends();
  }, [user.friends]);
  
  // Fetch chat previews for each friend
  const fetchChatPreviews = async (friendsList: Friend[]) => {
    try {
      const previewPromises = friendsList.map(async (friend) => {
        try {
          // Fetch last message and unread count
          const response = await fetch(`${API_BASE_URL}/friends/chat-preview?username=${user.username}&friendUsername=${friend.username}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')?.replace(/"/g, '')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            return {
              friend,
              lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: new Date(data.lastMessage.timestamp)
              } : null,
              unreadCount: data.unreadCount || 0
            };
          } else {
            return {
              friend,
              lastMessage: null,
              unreadCount: 0
            };
          }
        } catch (error) {
          console.error(`Error fetching chat preview for ${friend.username}:`, error);
          return {
            friend,
            lastMessage: null,
            unreadCount: 0
          };
        }
      });
      
      const previews = await Promise.all(previewPromises);
      
      // Sort by most recent message first
      previews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime();
      });
      
      setChatPreviews(previews);
    } catch (error) {
      console.error("Error fetching chat previews:", error);
    }
  };
  
  // Removed WebSocket message handling for chat messages
  useEffect(() => {
    // Placeholder for future real-time updates if needed
    return () => {};
  }, [user.username, friends]);
  
  // Format timestamp for display
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      // Today, show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
      // Yesterday
      return t('chat.yesterday');
    } else {
      // Earlier, show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  // Filter chats based on search query
  const filteredChats = searchQuery.trim() ? 
    chatPreviews.filter(preview => 
      preview.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) : 
    chatPreviews;
  
  const handleOpenChat = (friend: Friend) => {
    console.log('Opening chat with friend:', friend.username);
    
    // Mark messages as read when opening chat
    setChatPreviews(prevPreviews => {
      return prevPreviews.map(preview => {
        if (preview.friend.username === friend.username) {
          return { ...preview, unreadCount: 0 };
        }
        return preview;
      });
    });
    
    // Set active chat friend
    setActiveChatFriend(friend);
    
    // Navigate to the chat URL to update the browser URL
    navigate(`/chats/${friend.username}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // If we have an active chat, show the chat component
  if (activeChatFriend) {
    return (
      <div className="min-h-screen bg-background bg-gaming-pattern">
        <Header />
        <main className="flex-1 container-gaming py-6">
          <div className="max-w-4xl mx-auto">
            <ChatInterface friendUsername={activeChatFriend.username} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header />
      <main className="flex-1 container-gaming py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-heading-2 text-foreground">{t('chat.title')}</h1>
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <CompetitiveInput
                  type="text"
                  placeholder={t('friends.search.placeholder')}
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="pl-10 w-full sm:w-64 bg-card text-white border"
                />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('chat.conversations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredChats.length > 0 ? (
                <div className="space-y-2">
                  {filteredChats.map((chatPreview) => (
                    <div 
                      key={chatPreview.friend.username} 
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                        chatPreview.unreadCount > 0 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-card border-border hover:bg-card/80'
                      }`}
                      onClick={() => handleOpenChat(chatPreview.friend)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <UserAvatar
                            user={{ username: chatPreview.friend.username, avatar: chatPreview.friend.avatar }}
                            size="md"
                          />
                          {chatPreview.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {chatPreview.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{chatPreview.friend.username}</div>
                        </div>
                        {chatPreview.lastMessage && (
                          <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatMessageTime(chatPreview.lastMessage.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery.trim() ? t('friends.search.no_results') : t('chat.no_conversations')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 