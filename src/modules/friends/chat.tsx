import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Smile } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { CompetitiveInput } from '../../shared/ui/input';
import { UserAvatar } from '../../shared/ui/user-avatar';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlobalStore } from '../../shared/interface/gloabL_var';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../shared/ui/dropdown-menu';
import { API_BASE_URL, WEBSOCKET_URL } from '../../shared/config';
import AvatarStorage from '../../shared/utils/avatar-storage';
import type { Friend } from '../../shared/interface/user';
import axios from 'axios';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  message: string;
  timestamp: number;
  is_read: boolean;
  message_type: string;
}

const COMMON_EMOJIS = [
  '😀', '😍', '👍', '❤️', '😂', '🎉', 
  '🤔', '😎', '🥳', '👏', '😢', '🤯'
];

interface ChatInterfaceProps {
  friendUsername?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ friendUsername }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username: urlUsername = 'Friend' } = useParams<{ username?: string }>();
  const { user } = useGlobalStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const originalTitleRef = useRef<string>('');

  // Use friendUsername prop if available, otherwise fall back to URL parameter
  const username = friendUsername || urlUsername;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [, setHasUnreadMessages] = useState(false);
  const [, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [friendData, setFriendData] = useState<Friend | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);

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
              console.log('[Chat Interface] Cached server avatar for', friendUsername);
            }
          } catch (error) {
            console.warn('[Chat Interface] Failed to cache server avatar:', error);
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

  // Check if user is trying to chat with themselves
  const isSelfChat = user.username === username;

  console.log('ChatInterface - Current user:', user.username, 'Chat with:', username, 'Is self chat:', isSelfChat);

  // Initialize component
  useEffect(() => {
    originalTitleRef.current = document.title;

    return () => {
      // Reset title when component unmounts
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  // Prevent self-chat
  useEffect(() => {
    if (isSelfChat) {
      console.warn('Cannot chat with yourself');
      return;
    }
  }, [isSelfChat]);

  // Handle focus events to clear notifications
  useEffect(() => {
    const handleFocus = () => {
      setHasUnreadMessages(false);
      document.title = originalTitleRef.current;
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Update browser title for visual notification
  const updateTitleNotification = () => {
    if (!document.hasFocus()) {
      document.title = `💬 New message - ${originalTitleRef.current}`;
      setHasUnreadMessages(true);
    }
  };

  // Fetch chat history using new API
  const fetchChatHistory = async () => {
    if (isSelfChat) {
      console.log('Skipping chat history fetch - cannot chat with yourself');
      return;
    }

    try {
      console.log('Fetching chat history between', user.username, 'and', username);
      const response = await fetch(
        `${API_BASE_URL}/simple-chat/history?sender=${user.username}&receiver=${username}`
      );
      
      if (response.ok) {
        const historicalMessages = await response.json();
        console.log('Fetched chat history:', historicalMessages);
        setMessages(historicalMessages || []);
      } else {
        console.error('Failed to fetch chat history:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to fetch chat history', error);
      setMessages([]);
    }
  };

  // Establish WebSocket connection using new simple chat endpoint
  const connectWebSocket = () => {
    if (isSelfChat) {
      console.log('Skipping WebSocket connection - cannot chat with yourself');
      return;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');

    const ws = new WebSocket(
      `${WEBSOCKET_URL}/ws/simple-chat?username=${user.username}&receiver=${username}`
    );

    ws.onopen = () => {
      console.log('Simple chat WebSocket connection established');
      setIsConnecting(false);
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        console.log('Received WebSocket message:', messageData);
        
        if (messageData.error) {
          console.error('WebSocket error:', messageData.error);
          return;
        }

        // Add message to local state
        const newMsg: Message = {
          id: messageData.id || `${Date.now()}`,
          sender: messageData.sender || user.username,
          receiver: messageData.receiver || username,
          message: messageData.message || '',
          timestamp: messageData.timestamp || Date.now(),
          is_read: messageData.is_read || false,
          message_type: messageData.message_type || 'text'
        };

        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const existingMessage = prev.find(msg => msg.id === newMsg.id);
          if (existingMessage) {
            return prev;
          }
          return [...prev, newMsg];
        });

        // Trigger visual notification for messages from others
        if (newMsg.sender !== user.username) {
          updateTitleNotification();
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    };

    websocketRef.current = ws;
  };

  useEffect(() => {
    if (user.username && username && !isSelfChat) {
      fetchChatHistory();
      connectWebSocket();
    }

    // Cleanup on component unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [username, user.username, isSelfChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchAvatarData = async () => {
      // Fetch friend data
      if (username && !isSelfChat) {
        const friend = await fetchFriendDataWithAvatar(username);
        setFriendData(friend);
        console.log('Friend data fetched:', friend);
      }
      
      // Fetch current user avatar
      if (user.username) {
        try {
          const currentUser = await fetchFriendDataWithAvatar(user.username);
          setCurrentUserAvatar(currentUser.avatar);
          console.log('Current user avatar fetched:', currentUser.avatar);
        } catch (error) {
          console.error('Error fetching current user avatar:', error);
          // Fallback to user.avatar if available
          const avatarUrl = user.avatar ? 
            (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`) : 
            null;
          setCurrentUserAvatar(avatarUrl);
        }
      }
    };
    fetchAvatarData();
  }, [username, isSelfChat, user.username, user.avatar]); 

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || isSelfChat) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      // Send via WebSocket
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        const messageData = {
          message: messageToSend,
          type: 'text'
        };

        console.log('Sending message via WebSocket:', messageData);
        websocketRef.current.send(JSON.stringify(messageData));
      } else {
        // Fallback: Send via API if WebSocket is not available
        console.log('WebSocket not available, sending via API');
        const response = await fetch(`${API_BASE_URL}/simple-chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender_username: user.username,
            receiver_username: username,
            message_content: messageToSend,
            message_type: 'text'
          })
        });

        if (response.ok) {
          const sentMessage = await response.json();
          console.log('Message sent via API:', sentMessage);
          
          // Add to local state
          const newMsg: Message = {
            id: sentMessage.id,
            sender: sentMessage.sender,
            receiver: sentMessage.receiver,
            message: sentMessage.message,
            timestamp: sentMessage.timestamp,
            is_read: sentMessage.is_read,
            message_type: sentMessage.message_type
          };
          
          setMessages(prev => [...prev, newMsg]);
        } else {
          console.error('Failed to send message via API:', response.status);
        }
      }
      
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleGoBack = () => {
    navigate(`/${user.username}/chats`);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Show error message if user tries to chat with themselves
  if (isSelfChat) {
    return (
      <div className="flex flex-col h-screen max-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>
        </header>

        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Cannot Chat with Yourself</h3>
            <p className="text-muted-foreground mb-4">
              You need to select a friend to start chatting. Go back to your friends list and select someone to chat with.
            </p>
            <Button onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Friends
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <UserAvatar 
            user={{ username: username || 'Friend', avatar: friendData?.avatar || null}} 
            size="md" 
          />
          <div>
            <h2 className="text-lg font-semibold">{username}</h2>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages && messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-end space-x-2 ${
              msg.sender === user.username ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender !== user.username && (
              <UserAvatar 
                user={{ username: msg.sender, avatar: friendData?.avatar || null }} 
                size="sm" 
              />
            )}
            <div 
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.sender === user.username 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              <p>{msg.message}</p>
              <span className="text-xs opacity-50 block text-right mt-1">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
            {msg.sender === user.username && (
              <UserAvatar 
                user={{ username: user.username, avatar: currentUserAvatar }} 
                size="sm" 
              />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
        </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Smile className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 grid grid-cols-6 gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <DropdownMenuItem 
                  key={emoji} 
                  onSelect={() => addEmoji(emoji)}
                  className="justify-center cursor-pointer hover:bg-muted rounded"
                >
                  <span className="text-2xl">{emoji}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-grow">
            <CompetitiveInput 
              ref={inputRef}
              placeholder={t('chat.messagePlaceholder')}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background"
            />
          </div>
          <Button 
            onClick={handleSendMessage} 
            disabled={newMessage.trim() === '' || connectionStatus === 'connecting'}
            size="sm"
            variant="outline"
          >
            <Send className="h-4 w-4 mr-2" />
            {connectionStatus === 'connecting' ? 'Connecting...' : t('chat.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 