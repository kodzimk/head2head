import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Send, ArrowLeft } from 'lucide-react';
import { UserAvatar } from '../../shared/ui/user-avatar';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../shared/interface/gloabL_var';
import { newSocket } from '../../app/App';
import type { User, Friend } from '../../shared/interface/user';

// Message interface
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export default function FriendChat({ user, friend, onBack }: { user: User, friend: Friend, onBack: () => void }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Load chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/friends/chat-history?username=${user.username}&friendUsername=${friend.username}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')?.replace(/"/g, '')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
  }, [user.username, friend.username]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Listen for new messages from WebSocket
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message' && data.data) {
          const messageData = data.data;
          
          // Only add message if it's from the current chat
          if (
            (messageData.senderId === user.username && messageData.receiverId === friend.username) ||
            (messageData.senderId === friend.username && messageData.receiverId === user.username)
          ) {
            setMessages(prevMessages => [
              ...prevMessages,
              {
                ...messageData,
                timestamp: new Date(messageData.timestamp)
              }
            ]);
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
  }, [user.username, friend.username]);
  
  // Mark messages as read
  useEffect(() => {
    const markMessagesAsRead = async () => {
      try {
        await fetch(`${API_BASE_URL}/friends/mark-messages-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')?.replace(/"/g, '')}`
          },
          body: JSON.stringify({
            username: user.username,
            friendUsername: friend.username
          })
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    markMessagesAsRead();
  }, [user.username, friend.username]);
  
  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const messageData = {
      senderId: user.username,
      receiverId: friend.username,
      content: newMessage,
      timestamp: new Date(),
      read: false
    };
    
    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    setMessages(prevMessages => [
      ...prevMessages,
      { ...messageData, id: tempId }
    ]);
    
    setNewMessage('');
    
    // Send via WebSocket
    if (newSocket && newSocket.readyState === WebSocket.OPEN) {
      newSocket.send(JSON.stringify({
        type: 'chat_message',
        ...messageData
      }));
    } else {
      console.error('WebSocket not connected');
    }
  };
  
  // Format timestamp
  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for message groups
  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Group messages by date
  const groupedMessages = messages.reduce((groups: {[key: string]: Message[]}, message) => {
    const date = message.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
  
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="border-b">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <UserAvatar 
            user={{ username: friend.username, avatar: friend.avatar }}
            size="lg"
            className="mr-3" 
          />
          <CardTitle variant="small">{friend.username}</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-3">
                <div className="flex justify-center">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    {formatMessageDate(new Date(date))}
                  </span>
                </div>
                
                {dateMessages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.senderId === user.username ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.senderId === user.username 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div>{message.content}</div>
                      <div className={`text-xs mt-1 ${
                        message.senderId === user.username 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form 
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            placeholder={t('chat.type_message')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 