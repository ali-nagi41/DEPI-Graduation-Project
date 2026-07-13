"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./services/db"));
const api_1 = __importDefault(require("./routes/api"));
const socketHandler_1 = __importDefault(require("./sockets/socketHandler"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Configure Socket.io with CORS matching our client ports
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all origins for simple out of the box testing, can narrow in production
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }
});
// Expose io instance to express app context
app.set('io', io);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use('/api', api_1.default);
// Socket.io connections
(0, socketHandler_1.default)(io);
// Serve static frontend assets in production mode if they are built
const clientBuildPath = path_1.default.join(__dirname, '../../client/dist');
app.use(express_1.default.static(clientBuildPath));
// Fallback index.html router for SPA routing in production
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'), (err) => {
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
    await db_1.default.connect(MONGO_URI);
    server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 AI-Sprint Server running on http://localhost:${PORT}`);
        console.log(`🔧 DB Mode: ${db_1.default.isFallbackMode ? 'JSON File Storage (Fallback)' : 'MongoDB'}`);
        console.log(`🤖 AI Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini API' : 'Local Mock Mode'}`);
        console.log(`====================================================`);
    });
};
startServer();
