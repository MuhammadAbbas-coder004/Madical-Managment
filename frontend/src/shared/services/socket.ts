import { io, Socket } from 'socket.io-client';

export const socket: Socket = io('http://localhost:5000', {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

export default socket;
