import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  socket = io(API_BASE_URL, {
    auth: {
      token
    }
  });

  socket.on('connect', () => {
    // console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    // console.log('Socket disconnected');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default socket;
