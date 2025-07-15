import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Input } from '../../shared/ui/input';
import { Search } from 'lucide-react';
import Header from '../dashboard/header';
import type { Friend, User } from "../../shared/interface/user";
import { API_BASE_URL } from "../../shared/interface/gloabL_var";
import { newSocket } from "../../app/App";
import { UserAvatar } from "../../shared/ui/user-avatar";
import { useTranslation } from 'react-i18next';
import FriendChat from './chat';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Message interface
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

// Chat preview interface
interface ChatPreview {
  friend: Friend;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function ChatsPage({ user }: { user: User }) {
  const { username: urlUsername } = useParams<{ username?: string }>();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

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
        const friendPromises = user.friends.map(async (friendUsername) => {
          try {
            const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`);
            
            return {
              username: response.data.username,
              status: "",
              avatar: response.data.avatar ? 
                (response.data.avatar.startsWith('http') ? response.data.avatar : `${API_BASE_URL}${response.data.avatar}`) : 
                null,
              rank: response.data.ranking.toString()
            };
          } catch (error) {
            console.error(`Error fetching friend data for ${friendUsername}:`, error);
            return {
              username: friendUsername,
              status: "",
              avatar: null,
              rank: "0"
            };
          }
        });
        
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
  
  // Listen for new messages from WebSocket
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message' && data.data) {
          const messageData = data.data;
          
          // Update chat previews when a new message arrives
          if (messageData.senderId === user.username || messageData.receiverId === user.username) {
            // Get the friend's username
            const friendUsername = messageData.senderId === user.username ? 
              messageData.receiverId : messageData.senderId;
            
            // Update chat previews
            setChatPreviews(prevPreviews => {
              const updatedPreviews = [...prevPreviews];
              const previewIndex = updatedPreviews.findIndex(
                preview => preview.friend.username === friendUsername
              );
              
              if (previewIndex !== -1) {
                // Update existing preview
                const updatedPreview = { ...updatedPreviews[previewIndex] };
                updatedPreview.lastMessage = {
                  ...messageData,
                  timestamp: new Date(messageData.timestamp)
                };
                
                // Increment unread count if message is to current user and not from current user
                if (messageData.receiverId === user.username && messageData.senderId !== user.username) {
                  updatedPreview.unreadCount += 1;
                }
                
                updatedPreviews[previewIndex] = updatedPreview;
                
                // Move this chat to the top
                const [movedPreview] = updatedPreviews.splice(previewIndex, 1);
                updatedPreviews.unshift(movedPreview);
              } else {
                // This is a new chat, fetch friend data and add preview
                const friendData = friends.find(f => f.username === friendUsername);
                if (friendData) {
                  updatedPreviews.unshift({
                    friend: friendData,
                    lastMessage: {
                      ...messageData,
                      timestamp: new Date(messageData.timestamp)
                    },
                    unreadCount: messageData.receiverId === user.username ? 1 : 0
                  });
                }
              }
              
              return updatedPreviews;
            });
          }
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error);
      }
    };

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage);
    }

    return () => {
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage);
      }
    };
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
    // Mark messages as read when opening chat
    setChatPreviews(prevPreviews => {
      return prevPreviews.map(preview => {
        if (preview.friend.username === friend.username) {
          return { ...preview, unreadCount: 0 };
        }
        return preview;
      });
    });
    
    setActiveChatFriend(friend);
  };

  // If we have an active chat, show the chat component
  if (activeChatFriend) {
    return (
      <div className="min-h-screen bg-background bg-gaming-pattern">
        <Header />
        <main className="flex-1 container-gaming py-6">
          <div className="max-w-4xl mx-auto">
            <FriendChat 
    
            />
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
                <Input
                  type="text"
                  placeholder={t('friends.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                          <div className="text-sm text-muted-foreground truncate">
                            {chatPreview.lastMessage ? (
                              chatPreview.lastMessage.senderId === user.username ? (
                                <span className="text-muted-foreground/70">{t('chat.you')}: </span>
                              ) : null
                            ) : null}
                            {chatPreview.lastMessage?.content || t('chat.no_messages')}
                          </div>
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