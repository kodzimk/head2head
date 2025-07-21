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
import { API_URL, WEBSOCKET_URL } from '../../shared/config';

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  is_read: boolean;
  message_type: string;
}

const COMMON_EMOJIS = [
  '😀', '😍', '👍', '❤️', '😂', '🎉', 
  '🤔', '😎', '🥳', '👏', '😢', '🤯'
];

const ChatInterface: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username = 'Friend' } = useParams<{ username?: string }>();
  const { user } = useGlobalStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Fetch chat history
    const fetchChatHistory = async () => {
      try {
        const response = await fetch(
          `${API_URL}/chat/history?sender=${user.username}&receiver=${username}`
        );
        const historicalMessages = await response.json();
        
        // Ensure historicalMessages is an array
        const validMessages = Array.isArray(historicalMessages) 
          ? historicalMessages 
          : [];
        
        setMessages(validMessages);
      } catch (error) {
        console.error('Failed to fetch chat history', error);
        setMessages([]); // Ensure messages is always an array
      }
    };

    // Establish WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(
        `${WEBSOCKET_URL}/ws/chat?username=${user.username}&receiver=${username}`
      );

      ws.onopen = () => {
        console.log('WebSocket connection established');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Ensure message matches Message interface
          const validMessage: Message = {
            id: message.id || `${Date.now()}`,
            sender: message.sender || user.username,
            message: message.message || '',
            timestamp: message.timestamp || Date.now(),
            is_read: message.is_read || false,
            message_type: message.message_type || 'text'
          };

          setMessages(prev => [...prev, validMessage]);
        } catch (error) {
          console.error('Failed to parse WebSocket message', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      websocketRef.current = ws;
    };

    fetchChatHistory();
    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [username, user.username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '' || !websocketRef.current) return;

    const messageData = {
      message: newMessage,
      type: 'text'
    };

    websocketRef.current.send(JSON.stringify(messageData));
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleGoBack = () => {
    navigate('/friends');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

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
            user={{ username: username || 'Friend', avatar: '' }} 
            size="md" 
          />
          <div>
            <h2 className="text-lg font-semibold">{username}</h2>
            <p className="text-sm text-muted-foreground">Online</p>
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
                user={{ username: msg.sender, avatar: '' }} 
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
                user={{ username: user.username, avatar: '' }} 
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
            disabled={newMessage.trim() === ''}
            size="sm"
            variant="outline"
          >
            <Send className="h-4 w-4 mr-2" />
            {t('chat.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 