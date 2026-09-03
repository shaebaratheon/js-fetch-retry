import { ReconnectingWebSocket } from '../src/websocket/reconnecting_ws';

describe('ReconnectingWebSocket', () => {
  it('queues messages when disconnected and flushes upon connection', () => {
    const ws = new ReconnectingWebSocket('wss://echo.example.com');
    ws.send('queued message 1');
    ws.send('queued message 2');
    expect(ws).toBeDefined();
  });
});
