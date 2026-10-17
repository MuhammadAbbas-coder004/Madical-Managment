import { io, Socket } from 'socket.io-client';
import api from './api';

const socketUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

export const socket: Socket = io(socketUrl, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

export default socket;
