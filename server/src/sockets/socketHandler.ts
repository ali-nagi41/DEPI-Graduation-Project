import { Server, Socket } from 'socket.io';

export const initSocketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a room for a specific project
    socket.on('joinProject', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`👤 Client ${socket.id} joined project room: project:${projectId}`);
    });

    // Leave a room for a specific project
    socket.on('leaveProject', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      console.log(`👤 Client ${socket.id} left project room: project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
export default initSocketHandler;
