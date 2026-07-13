import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { socketUpdateProject, fetchProjects } from '../store/projectSlice';

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;

  connect() {
    // Determine target URL. In dev mode, Vite proxies this, but Socket.io needs the direct server port
    // In production, it connects to the current host
    const socketUrl = '/';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to real-time WebSocket server.');
      // If room was active before disconnect, rejoin it
      if (this.currentRoom) {
        this.socket?.emit('joinProject', this.currentRoom);
      }
    });

    // Real-time task status / fields update handler
    this.socket.on('taskUpdated', (updatedProject) => {
      console.log('🔔 Received taskUpdated socket event');
      store.dispatch(socketUpdateProject(updatedProject));
    });

    // Real-time project list addition/deletion handler
    this.socket.on('projectListUpdated', () => {
      console.log('🔔 Received projectListUpdated socket event');
      store.dispatch(fetchProjects());
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server.');
    });
  }

  joinProjectRoom(projectId: string) {
    if (!this.socket) this.connect();
    
    if (this.currentRoom) {
      this.socket?.emit('leaveProject', this.currentRoom);
    }
    
    this.currentRoom = projectId;
    this.socket?.emit('joinProject', projectId);
    console.log(`👤 Client joined real-time project room: ${projectId}`);
  }

  leaveProjectRoom(projectId: string) {
    if (this.socket && this.currentRoom === projectId) {
      this.socket.emit('leaveProject', projectId);
      this.currentRoom = null;
      console.log(`👤 Client left project room: ${projectId}`);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
