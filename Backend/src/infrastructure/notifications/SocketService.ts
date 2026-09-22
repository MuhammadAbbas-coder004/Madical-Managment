import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const setup = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', (userId: string) => {
      if (userId) {
        socket.join(userId);
      }
    });
  });

  return io;
};

export const sendAlertToUser = (userId: string, message: string): void => {
  if (!io) {
    console.warn('Socket.io has not been initialized yet.');
    return;
  }
  io.to(userId).emit('notification', message);
};

export class SocketService {
  public static setup(server: HttpServer): SocketIOServer {
    return setup(server);
  }

  public static sendAlertToUser(userId: string, message: string): void {
    sendAlertToUser(userId, message);
  }

  public static getIO(): SocketIOServer | null {
    return io;
  }
}
