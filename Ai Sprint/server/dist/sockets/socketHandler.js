"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketHandler = void 0;
const initSocketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // Join a room for a specific project
        socket.on('joinProject', (projectId) => {
            socket.join(`project:${projectId}`);
            console.log(`👤 Client ${socket.id} joined project room: project:${projectId}`);
        });
        // Leave a room for a specific project
        socket.on('leaveProject', (projectId) => {
            socket.leave(`project:${projectId}`);
            console.log(`👤 Client ${socket.id} left project room: project:${projectId}`);
        });
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
};
exports.initSocketHandler = initSocketHandler;
exports.default = exports.initSocketHandler;
