import { IMessageDocument, winstonLogger } from '@eoladapo/jobman-shared';
import { config } from '@gateway/config';
import { GatewayCache } from '@gateway/redis/gateway.cache';
import { Server, Socket } from 'socket.io';
import { io, Socket as SocketClient } from 'socket.io-client';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'gatewaySocket', 'debug');
let chatSocketClient: SocketClient;
export class SocketIOAppHandler {
  private io: Server;
  private gatewayCache: GatewayCache;

  constructor(io: Server) {
    this.io = io;
    this.gatewayCache = new GatewayCache();
    this.chatSocketServiceIOConnections();
  }

  public listen(): void {
    this.chatSocketServiceIOConnections();
    this.io.on('connection', async (socket: Socket) => {
      socket.on('getLoggedInUser', async () => {
        const response: string[] = await this.gatewayCache.getLoggedInUserFromCache('loggedInUsers');
        this.io.emit('online', response);
      });

      socket.on('loggedInUser', async (username: string) => {
        const response: string[] = await this.gatewayCache.savedLoggedInUserToCache('loggedInUsers', username);
        this.io.emit('online', response);
      });

      socket.on('removeLoggedInUser', async (username: string) => {
        const response: string[] = await this.gatewayCache.removeLoggedInUserFromCache('loggedInUsers', username);
        this.io.emit('online', response);
      });

      socket.on('category', async (category: string, username: string) => {
        await this.gatewayCache.saveUserSelectedCategory(`selectedCategories:${username}`, category);
      });
    });
  }

  private chatSocketServiceIOConnections(): void {
    chatSocketClient = io(`${config.MESSAGE_BASE_URL}`, {
      transports: ['websocket', 'polling'],
      secure: true
    });

    chatSocketClient.on('connect', () => {
      log.info('ChatService socket connected');
    });

    chatSocketClient.on('disconnect', (reason: SocketClient.DisconnectReason) => {
      log.log('error', `ChatSocket disconnected: ${reason}`);
      chatSocketClient.connect();
    });

    chatSocketClient.on('connect_error', (error: Error) => {
      log.log('error', `ChatService socket connection error: ${error}`);
      chatSocketClient.connect();
    });

    // custom event
    chatSocketClient.on('message received', (data: IMessageDocument) => {
      this.io.emit('message received', data);
    });

    chatSocketClient.on('message updated', (data: IMessageDocument) => {
      this.io.emit('message received', data);
    });
  }
}
