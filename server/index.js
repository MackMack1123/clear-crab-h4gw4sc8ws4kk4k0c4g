const path = require('path');
// Load root .env (Firebase) and local .env (Mongo)
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Root .env
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Server .env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();
// Trust proxy (required for correct protocol detection behind Load Balancers/Coolify)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

const userRoutes = require('./routes/users');
const sponsorshipRoutes = require('./routes/sponsorships');
const campaignRoutes = require('./routes/campaigns');
const uploadRoutes = require('./routes/upload');

// --- CORS Configuration ---

const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://getfundraisr.io',
    'https://www.getfundraisr.io'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? [...new Set([...process.env.ALLOWED_ORIGINS.split(','), ...defaultOrigins])]
    : defaultOrigins;

// Custom CORS middleware that allows any origin for widget routes
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Widget routes: allow ANY origin (for embedding on external sites)
    if (req.path.startsWith('/api/widget') || req.path.startsWith('/widget')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        return next();
    }

    // All other routes: use standard CORS with allowed origins
    if (!origin) {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        return next();
    }

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-email, x-admin-key');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        return next();
    }

    // Block disallowed origins
    if (process.env.NODE_ENV !== 'production') {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
    }
    return res.status(403).json({ error: 'Not allowed by CORS' });
});

// --- Rate Limiting ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all API routes (skip tracking endpoints — they have their own limiters)
app.use('/api/', (req, res, next) => {
    if (req.path.startsWith('/analytics/track') || req.path.startsWith('/widget/track')) {
        return next();
    }
    limiter(req, res, next);
});

// Stricter rate limit for auth-related endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 minutes
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// Middleware
app.use(express.json());

// Request logging middleware (logs important requests)
app.use((req, res, next) => {
    // Log payment and auth related requests
    if (req.path.includes('/payments') || req.path.includes('/auth')) {
        logger.request(req, 'REQUEST', { query: req.query });
    }
    next();
});
// Serve static uploads
// Serve static uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'public/uploads');
console.log(`[Storage] Serving uploads from: ${uploadDir}`);
app.use('/uploads', express.static(uploadDir));

// Routes
const contactRoutes = require('./routes/contact');
const waitlistRoutes = require('./routes/waitlist');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/packages', require('./routes/packages'));
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', require('./routes/contact'));
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/payments/stripe', require('./routes/payments/stripe'));
app.use('/api/payments/square', require('./routes/payments/square'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth/github', authLimiter, require('./routes/auth/github')); // Auth rate limited
app.use('/api/auth/magic-link', authLimiter, require('./routes/auth/magicLink'));
app.use('/api/email', require('./routes/email'));
app.use('/api/system', require('./routes/system'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/team', require('./routes/team'));
// Widget tracking rate limiter (generous — external sites fire these)
const widgetTrackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});
app.use('/api/widget/track', widgetTrackingLimiter);
// Page view tracking rate limiter (generous — public pages fire these)
const pageTrackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});
app.use('/api/analytics/track', pageTrackingLimiter);
app.use('/api/widget', require('./routes/widget'));
app.use('/api/slack', require('./routes/slack'));

// Serve widget script with permissive CORS for embedding on any site
app.use('/widget', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
    next();
}, express.static(path.join(__dirname, 'public/widget')));

app.get('/', (req, res) => {
    res.send('Fundraisr API is running');
});

// Health check endpoint for monitoring
app.get('/api/health', async (req, res) => {
    const healthcheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    };

    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState === 1) {
            healthcheck.database = 'connected';
        } else {
            healthcheck.database = 'disconnected';
            healthcheck.status = 'degraded';
        }
        res.status(healthcheck.status === 'ok' ? 200 : 503).json(healthcheck);
    } catch (error) {
        healthcheck.status = 'error';
        healthcheck.error = error.message;
        res.status(503).json(healthcheck);
    }
});

// 404 handler for unknown routes
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Global error handler - catches all unhandled errors
app.use((err, req, res, next) => {
    // Log the error
    logger.exception(err, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.headers['x-user-id'] || 'anonymous',
        body: process.env.NODE_ENV !== 'production' ? req.body : undefined
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID format'
        });
    }

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS policy violation'
        });
    }

    // Default error response
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.exception(err, { type: 'uncaughtException' });
    // Give logger time to write before exiting
    setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
    });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr')
    .then(() => logger.info('MongoDB Connected'))
    .catch(err => logger.exception(err, { context: 'MongoDB Connection' }));

app.listen(PORT, () => {
    logger.info(`Server started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});
