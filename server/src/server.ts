import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import dbService from './services/db';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import socketHandler from './sockets/socketHandler';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS matching our client ports
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simple out of the box testing, can narrow in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// Expose io instance to express app context
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Socket.io connections
socketHandler(io);

// Serve static frontend assets in production mode if they are built
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Fallback index.html router for SPA routing in production
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      // If client build doesn't exist, show fallback API welcome message
      res.status(200).json({
        success: true,
        message: 'AI-Sprint backend API is running. Client front-end is not compiled yet.',
        endpoints: {
          projects: '/api/projects'
        }
      });
    }
  });
});

// App initialization
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const startServer = async () => {
  // Connect to Database (handles local fallback internally)
  await dbService.connect(MONGO_URI);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AI-Sprint Server running on http://localhost:${PORT}`);
    console.log(`🔧 DB Mode: ${dbService.isFallbackMode ? 'JSON File Storage (Fallback)' : 'MongoDB'}`);
    console.log(`🤖 AI Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini API' : 'Local Mock Mode'}`);
    console.log(`====================================================`);
  });
};

startServer();
