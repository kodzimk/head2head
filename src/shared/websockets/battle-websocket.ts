import { API_BASE_URL } from '../interface/gloabL_var';

export type BattleMessageHandler = (data: any) => void;

export class BattleWebSocket {
  public ws!: WebSocket; // Use definite assignment assertion
  private handlers: BattleMessageHandler[] = [];
  public battleId: string;
  public username: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // 1 second
  private battleEndHandler: (() => void) | null = null;

  constructor(battleId: string, username: string) {
    this.battleId = battleId;
    this.username = username;
    this.connect();
  }

  private connect() {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'ws://');
    this.ws = new WebSocket(`${wsUrl}/ws/battle/${this.battleId}?username=${encodeURIComponent(this.username)}`);

    this.ws.onopen = () => {
      console.log(`[BATTLE_WS] Connected to battle ${this.battleId} as ${this.username}`);
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(`[BATTLE_WS] Message:`, data);
      this.handlers.forEach((handler) => handler(data));
    };

    this.ws.onerror = (event) => {
      console.error(`[BATTLE_WS] Error:`, event);
    };

    this.ws.onclose = (event) => {
      console.log(`[BATTLE_WS] Disconnected from battle ${this.battleId}`, event);
      
      // Attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[BATTLE_WS] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
          this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  send(data: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify(data));
    } else {
      console.error(`[BATTLE_WS] Cannot send message, WebSocket is not open. State: ${this.ws.readyState}`);
      throw new Error('WebSocket is not open');
    }
  }

  onBattleEnd(handler: () => void) {
    this.battleEndHandler = handler;
  }

  private handleBattleEnd() {
    console.log('[BATTLE_WS] Battle ended, triggering end handler');
    if (this.battleEndHandler) {
      this.battleEndHandler();
    }
  }

  onMessage(handler: BattleMessageHandler) {
    const wrappedHandler = (data: any) => {
      // Check for battle end message
      if (data.type === 'battle_end') {
        this.handleBattleEnd();
      }
      
      // Call original handler
      handler(data);
    };
    this.handlers.push(wrappedHandler);
  }

  close() {
    console.log(`[BATTLE_WS] Manually closing connection to battle ${this.battleId}`);
    this.ws.close(1000, 'Manual close'); // Clean close
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' {
    if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
} 