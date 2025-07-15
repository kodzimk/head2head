
import { WS_BASE_URL } from '../interface/gloabL_var';

interface ChatMessage {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp?: string;
}

interface TypingIndicator {
  sender_id: string;
}

export class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private typingHandlers: ((indicator: TypingIndicator) => void)[] = [];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 1000; // 1 second

  connect(username: string) {
    console.group('ChatWebSocket Connection');
    console.log('Attempting to connect with username:', username);

    // Validate and sanitize username
    if (!username || typeof username !== 'string') {
      console.error('Invalid username for WebSocket connection', { username });
      console.groupEnd();
      return;
    }

    // Trim and sanitize
    username = username.trim();

    // Additional validation
    if (username.length < 3 || username.length > 50) {
      console.error('Username length invalid', { 
        username, 
        length: username.length 
      });
      console.groupEnd();
      return;
    }

    // Optional: Add character validation if needed
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      console.error('Username contains invalid characters', { username });
      console.groupEnd();
      return;
    }

    // Disconnect existing connection if any
    this.disconnect();

    this.userId = username;
    
    try {
      // Use WS_BASE_URL from config to ensure correct WebSocket URL
      const wsUrl = `${WS_BASE_URL}/chat?username=${encodeURIComponent(username)}`;
      console.log('Attempting WebSocket connection', { 
        url: wsUrl, 
        username,
        timestamp: new Date().toISOString()
      });

      this.socket = new WebSocket(wsUrl);

      // Set longer timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout', {
            username,
            readyState: this.socket.readyState,
            timestamp: new Date().toISOString()
          });
          this.disconnect();
          console.groupEnd();
        }
      }, 10000); // 10-second timeout

      this.socket.onopen = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connection established', {
          url: wsUrl,
          username,
          event,
          timestamp: new Date().toISOString()
        });
        this.reconnectAttempts = 0; // Reset reconnect attempts
        console.groupEnd();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          console.log('Received WebSocket message', {
            type: data.type,
            username,
            timestamp: new Date().toISOString()
          });

          switch (data.type) {
            case 'chat':
              this.messageHandlers.forEach(handler => 
                handler({
                  sender_id: data.sender_id,
                  receiver_id: data.receiver_id,
                  content: data.content,
                  timestamp: data.timestamp
                })
              );
              break;
            case 'typing':
              this.typingHandlers.forEach(handler => 
                handler({ sender_id: data.sender_id })
              );
              break;
            default:
              console.warn('Unhandled message type', { 
                type: data.type, 
                username,
                timestamp: new Date().toISOString()
              });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message', {
            error,
            rawData: event.data,
            username,
            timestamp: new Date().toISOString()
          });
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connection closed', {
          wasClean: event.wasClean,
          code: event.code,
          reason: event.reason,
          username,
          timestamp: new Date().toISOString()
        });
        
        // More sophisticated reconnection strategy
        if (!event.wasClean) {
          if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            
            // Exponential backoff
            const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
            
            console.warn(`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`, {
              username,
              delay,
              timestamp: new Date().toISOString()
            });

            setTimeout(() => {
              this.connect(username);
            }, delay);
          } else {
            console.error('Max reconnection attempts reached', {
              username,
              timestamp: new Date().toISOString()
            });
            
            // Optional: Trigger a global error handler or notification
            // You might want to add a method to handle this in your app
            this.notifyConnectionFailure(username);
          }
        }
        console.groupEnd();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error', {
          error,
          username,
          timestamp: new Date().toISOString()
        });
        console.groupEnd();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection', {
        error,
        username,
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(message: {
    sender_id: string, 
    receiver_id: string, 
    content: string
  }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.socket.send(JSON.stringify({
      type: 'chat',
      sender_id: this.userId, // Use username as sender_id
      receiver_id: message.receiver_id,
      content: message.content
    }));
  }

  sendTypingIndicator(receiverId: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send typing indicator - WebSocket not connected');
      return;
    }

    this.socket.send(JSON.stringify({
      type: 'typing',
      sender_id: this.userId, // Use username as sender_id
      receiver_id: receiverId
    }));
  }

  onMessage(handler: (message: ChatMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onTyping(handler: (indicator: TypingIndicator) => void): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  // Optional method to handle connection failure
  private notifyConnectionFailure(username: string) {
    // You can implement a global error notification mechanism here
    console.error('Persistent WebSocket connection failure', {
      username,
      timestamp: new Date().toISOString()
    });
    // Example: 
    // window.dispatchEvent(new CustomEvent('websocket-connection-failed', { detail: { username } }));
  }
}

// Singleton instance
export const chatWebSocket = new ChatWebSocketClient(); 