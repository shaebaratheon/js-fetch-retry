/**
 * Resilient Reconnecting WebSocket Client with Heartbeat & Queue.
 */

export interface WebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectIntervalMs?: number;
  maxReconnectIntervalMs?: number;
  reconnectDecay?: number;
  heartbeatIntervalMs?: number;
  pingMessage?: string;
  pongTimeoutMs?: number;
}

export type MessageHandler = (data: string | ArrayBuffer) => void;
export type EventListener = () => void;

export class ReconnectingWebSocket {
  private ws: any = null;
  private isClosed = false;
  private reconnectAttempts = 0;
  private messageQueue: (string | ArrayBuffer)[] = [];
  private heartbeatTimer: any = null;
  private pongTimeoutTimer: any = null;
  private messageHandlers: MessageHandler[] = [];
  private openListeners: EventListener[] = [];
  private closeListeners: EventListener[] = [];

  constructor(
    private readonly url: string,
    private readonly options: WebSocketOptions = {}
  ) {
    this.options.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.options.reconnectIntervalMs = options.reconnectIntervalMs ?? 1000;
    this.options.maxReconnectIntervalMs = options.maxReconnectIntervalMs ?? 30000;
    this.options.reconnectDecay = options.reconnectDecay ?? 1.5;
    this.options.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15000;
    this.options.pingMessage = options.pingMessage ?? '{"type":"ping"}';
    this.options.pongTimeoutMs = options.pongTimeoutMs ?? 5000;
  }

  public connect() {
    this.isClosed = false;
    this.setupSocket();
  }

  private setupSocket() {
    if (this.isClosed) return;
    try {
      this.ws = new (globalThis as any).WebSocket(this.url);
      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event: any) => this.handleMessage(event);
      this.ws.onclose = () => this.handleClose();
      this.ws.onerror = () => this.handleError();
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushQueue();
    for (const listener of this.openListeners) listener();
  }

  private handleMessage(event: any) {
    this.resetPongTimeout();
    for (const handler of this.messageHandlers) handler(event.data);
  }

  private handleClose() {
    this.stopHeartbeat();
    for (const listener of this.closeListeners) listener();
    if (!this.isClosed) this.scheduleReconnect();
  }

  private handleError() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) return;
    const delay = Math.min(
      (this.options.reconnectIntervalMs || 1000) * Math.pow(this.options.reconnectDecay || 1.5, this.reconnectAttempts),
      this.options.maxReconnectIntervalMs || 30000
    );
    this.reconnectAttempts++;
    setTimeout(() => this.setupSocket(), delay);
  }

  public send(data: string | ArrayBuffer) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === 1) {
      const msg = this.messageQueue.shift();
      if (msg) this.ws.send(msg);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(this.options.pingMessage || '{"type":"ping"}');
      this.pongTimeoutTimer = setTimeout(() => this.handleError(), this.options.pongTimeoutMs);
    }, this.options.heartbeatIntervalMs);
  }

  private resetPongTimeout() {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
  }

  public onMessage(handler: MessageHandler) { this.messageHandlers.push(handler); }
  public onOpen(listener: EventListener) { this.openListeners.push(listener); }
  public onClose(listener: EventListener) { this.closeListeners.push(listener); }

  public close() {
    this.isClosed = true;
    this.stopHeartbeat();
    if (this.ws) this.ws.close();
  }
}
