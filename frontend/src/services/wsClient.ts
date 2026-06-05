import { WS_BASE_URL } from '../config/env';
import type { ConnectionStatus, GridPosition, RoomServerEvent } from '../types/api.types';

interface RoomWebSocketClientOptions {
  roomId: number;
  token: string;
  onEvent: (event: RoomServerEvent) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onError: (message: string) => void;
  onAuthenticationFailed?: () => void;
}

export class RoomWebSocketClient {
  private readonly maxReconnectAttempts = 6;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private manualClose = false;

  constructor(private readonly options: RoomWebSocketClientOptions) {
  }

  connect() {
    if (
      this.socket
      && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.manualClose = false;
    this.reconnectAttempts = 0;
    this.openSocket(false);
  }

  private openSocket(isReconnect: boolean) {
    this.options.onStatusChange(isReconnect ? 'reconnecting' : 'connecting');
    const url = `${WS_BASE_URL}/ws/rooms/${this.options.roomId}?token=${encodeURIComponent(this.options.token)}`;
    try {
      this.socket = new WebSocket(url);
    } catch {
      this.options.onError('Realtime connection could not be opened');
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onStatusChange('connected');
      this.send('ROOM_JOIN');
    };

    this.socket.onmessage = (message) => {
      try {
        this.options.onEvent(JSON.parse(message.data) as RoomServerEvent);
      } catch {
        this.options.onError('Invalid realtime message received');
      }
    };

    this.socket.onerror = () => {
      this.options.onError('Realtime connection error');
    };

    this.socket.onclose = (event) => {
      this.socket = null;
      if (this.manualClose) {
        this.options.onStatusChange('disconnected');
        return;
      }
      if (this.isAuthenticationFailure(event)) {
        this.options.onStatusChange('failed');
        this.options.onError('Realtime session expired. Please log in again.');
        this.options.onAuthenticationFailed?.();
        return;
      }
      if (event.code === 1008) {
        this.options.onStatusChange('failed');
        this.options.onError(event.reason || 'Realtime connection was rejected');
        return;
      }
      this.scheduleReconnect();
    };
  }

  sendMove(position: GridPosition) {
    this.send('USER_MOVED', position);
  }

  sendChat(message: string) {
    this.send('CHAT_MESSAGE', { message });
  }

  disconnect() {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.send('ROOM_LEAVE');
    this.socket?.close();
    this.socket = null;
    this.options.onStatusChange('disconnected');
  }

  private send(type: 'ROOM_JOIN' | 'ROOM_LEAVE' | 'USER_MOVED' | 'CHAT_MESSAGE', payload?: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify({ type, payload }));
  }

  private scheduleReconnect() {
    if (this.manualClose) {
      this.options.onStatusChange('disconnected');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.options.onStatusChange('failed');
      this.options.onError('Realtime connection failed after several attempts');
      return;
    }

    this.reconnectAttempts += 1;
    this.options.onStatusChange('reconnecting');
    const delayMs = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 8000);
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket(true);
    }, delayMs);
  }

  private isAuthenticationFailure(event: CloseEvent) {
    return event.code === 1008 && event.reason.toLowerCase().includes('authentication');
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === null) {
      return;
    }
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
