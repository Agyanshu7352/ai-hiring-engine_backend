const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load routes
const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const jdRoutes = require('./routes/jd.routes');
const matchRoutes = require('./routes/match.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://ai-hiring-engine-frontend.vercel.app', // ADD THIS LINE
  process.env.CLIENT_URL,        
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log('📨 Request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Static files (for uploaded resumes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api', resumeRoutes);
app.use('/api', jdRoutes);
app.use('/api', matchRoutes);
app.use('/api', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'AI Hiring Engine Backend',
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      allowedOrigins: allowedOrigins
    },
    mlService: process.env.ML_SERVICE_URL ? 'configured' : 'not configured'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Hiring Engine API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      resumes: '/api/resumes',
      jobDescriptions: '/api/job-descriptions',
      matches: '/api/matches',
      dashboard: '/api/dashboard'
    }
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   AI Hiring Engine Backend Server        ║
║   Running on port ${PORT}                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Time: ${new Date().toLocaleString()}     ║
║   CORS: Enabled for ${allowedOrigins.length} origins   ║
╚═══════════════════════════════════════════╝
  `);
  console.log('✅ Allowed origins:', allowedOrigins);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;