import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { db } from './db';
import { verifyAccessToken } from './auth/jwt';

export interface WsMessage<T = any> {
  type: string;
  mosqueId?: string;
  data?: T;
  meta?: {
    timestamp: string;
    senderId?: string;
    senderName?: string;
    eventId?: string;
  };
}

export interface ClientConnection {
  id: string;
  ws: WebSocket;
  userId: string;
  userName: string;
  userRole: string;
  mosqueId: string;
  isAlive: boolean;
  isAuthenticated: boolean;
  connectedAt: string;
}

class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const { pathname } = parse(request.url || '');
        if (pathname === '/ws') {
          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        }
      } catch (err) {
        console.warn('[WS] Upgrade error:', err);
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const parsedUrl = parse(req.url || '', true);
      const query = parsedUrl.query;

      const token = (query.token as string) || '';
      const mosqueIdParam = (query.mosqueId as string) || (query['x-mosque-id'] as string) || '';

      let userId = 'usr-guest';
      let userName = 'Guest User';
      let userRole = 'VIEWER';
      let mosqueId = ''; // Strict isolation: Unauthenticated connections have NO tenant identity
      let isAuthenticated = false;

      // Verify signed JWT token if provided
      if (token) {
        const verifyResult = verifyAccessToken(token);
        if (verifyResult.valid && verifyResult.payload) {
          const user = db.users.find(u => u.id === verifyResult.payload?.sub);
          if (user && user.status === 'ACTIVE') {
            userId = user.id;
            userName = user.name;
            userRole = user.role;
            mosqueId = user.mosqueId;
            isAuthenticated = true;

            // Allow SUPER_ADMIN to switch mosque scope if valid mosque exists
            if (user.role === 'SUPER_ADMIN' && mosqueIdParam) {
              const targetMosque = db.mosques.find(m => m.id === mosqueIdParam);
              if (targetMosque) {
                mosqueId = targetMosque.id;
              }
            }
          }
        }
      }

      const clientId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const client: ClientConnection = {
        id: clientId,
        ws,
        userId,
        userName,
        userRole,
        mosqueId,
        isAlive: true,
        isAuthenticated,
        connectedAt: new Date().toISOString(),
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId} (User: ${client.userName}, Role: ${client.userRole}, Mosque: ${client.mosqueId || 'NONE'}, Auth: ${isAuthenticated})`);

      // Send initial connection ack
      this.sendToClient(client, {
        type: 'CONNECTION_ACK',
        mosqueId: client.mosqueId || undefined,
        data: {
          clientId,
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole,
          mosqueId: client.mosqueId || undefined,
          isAuthenticated: client.isAuthenticated,
          serverTime: new Date().toISOString(),
          status: 'CONNECTED',
        }
      });

      // Handle incoming messages
      ws.on('message', (messageRaw: string) => {
        try {
          const parsed = JSON.parse(messageRaw.toString());
          this.handleClientMessage(client, parsed);
        } catch (e) {
          console.warn('[WS] Failed to parse client message:', e);
        }
      });

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error on client ${clientId}:`, err);
        this.clients.delete(clientId);
      });
    });

    // Start heartbeat
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`[WS] Terminating inactive client ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch (err) {
          this.clients.delete(clientId);
        }
      });
    }, 30000);

    console.log('[WS] WebSocket Server initialized on /ws');
  }

  private handleClientMessage(client: ClientConnection, msg: any) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'PING':
        this.sendToClient(client, {
          type: 'PONG',
          data: { timestamp: new Date().toISOString() }
        });
        break;

      case 'SUBSCRIBE_MOSQUE':
        // Guests cannot subscribe to mosque-scoped events
        if (!client.isAuthenticated || !client.userId || client.userId === 'usr-guest') {
          this.sendToClient(client, {
            type: 'ERROR',
            data: { code: 'UNAUTHORIZED', message: 'মসজিদ ইভেন্ট সাবস্ক্রিপশনের জন্য লগইন আবশ্যক।' }
          });
          break;
        }

        // Only SUPER_ADMIN or client's own mosque is permitted
        if (msg.mosqueId) {
          if (client.userRole === 'SUPER_ADMIN') {
            const targetMosque = db.mosques.find(m => m.id === msg.mosqueId);
            if (targetMosque) {
              client.mosqueId = targetMosque.id;
              this.sendToClient(client, {
                type: 'SUBSCRIBED',
                mosqueId: client.mosqueId,
                data: { mosqueId: client.mosqueId }
              });
            } else {
              this.sendToClient(client, {
                type: 'ERROR',
                data: { code: 'TENANT_NOT_FOUND', message: 'অনুরোধকৃত মসজিদ পাওয়া যায়নি।' }
              });
            }
          } else if (msg.mosqueId === client.mosqueId) {
            this.sendToClient(client, {
              type: 'SUBSCRIBED',
              mosqueId: client.mosqueId,
              data: { mosqueId: client.mosqueId }
            });
          } else {
            this.sendToClient(client, {
              type: 'ERROR',
              data: { code: 'TENANT_FORBIDDEN', message: 'অননুমোদিত মসজিদ সাবস্ক্রিপশন নিষিদ্ধ।' }
            });
          }
        }
        break;

      case 'AUTH':
        if (msg.token) {
          const verifyResult = verifyAccessToken(msg.token);
          if (verifyResult.valid && verifyResult.payload) {
            const user = db.users.find(u => u.id === verifyResult.payload?.sub);
            if (user && user.status === 'ACTIVE') {
              client.userId = user.id;
              client.userName = user.name;
              client.userRole = user.role;
              client.mosqueId = user.mosqueId;
              client.isAuthenticated = true;

              if (user.role === 'SUPER_ADMIN' && msg.mosqueId) {
                const targetMosque = db.mosques.find(m => m.id === msg.mosqueId);
                if (targetMosque) {
                  client.mosqueId = targetMosque.id;
                }
              }

              this.sendToClient(client, {
                type: 'AUTH_SUCCESS',
                data: {
                  userId: user.id,
                  userName: user.name,
                  role: user.role,
                  mosqueId: client.mosqueId,
                }
              });
              return;
            }
          }
          this.sendToClient(client, {
            type: 'AUTH_FAILED',
            data: { message: 'টোকেন যাচাইকরণ ব্যর্থ হয়েছে।' }
          });
        }
        break;

      default:
        break;
    }
  }

  sendToClient(client: ClientConnection, message: WsMessage) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          ...message,
          meta: {
            timestamp: new Date().toISOString(),
            eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ...message.meta,
          }
        }));
      } catch (err) {
        console.error(`[WS] Failed to send message to client ${client.id}:`, err);
      }
    }
  }

  broadcastToMosque(mosqueId: string, eventType: string, data: any, meta?: any, excludeClientId?: string) {
    if (!mosqueId) return;

    const payload: WsMessage = {
      type: eventType,
      mosqueId,
      data,
      meta,
    };

    let deliveredCount = 0;
    this.clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;

      // Deliver only to authenticated clients belonging to this mosque OR authenticated Super Admin
      if (client.isAuthenticated && (client.mosqueId === mosqueId || client.userRole === 'SUPER_ADMIN')) {
        this.sendToClient(client, payload);
        deliveredCount++;
      }
    });

    console.log(`[WS] Broadcast '${eventType}' for Mosque [${mosqueId}] -> delivered to ${deliveredCount} client(s).`);
  }

  broadcastSystem(eventType: string, data: any) {
    const payload: WsMessage = {
      type: eventType,
      data,
    };

    this.clients.forEach((client) => {
      this.sendToClient(client, payload);
    });
  }

  getConnectedClientsCount(mosqueId?: string): number {
    if (!mosqueId) return this.clients.size;
    let count = 0;
    this.clients.forEach((c) => {
      if (c.mosqueId === mosqueId || c.userRole === 'SUPER_ADMIN') count++;
    });
    return count;
  }
}

export const realtime = new RealtimeServer();
