/**
 * Simple structured logger for Fundraisr API
 * In production, this could be replaced with a service like Winston, Pino, or Datadog
 */

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

// Determine if we should log debug messages
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format a log entry as JSON for easy parsing
 */
function formatLog(level, message, meta = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    };

    // Remove sensitive data
    if (entry.password) delete entry.password;
    if (entry.token) entry.token = '[REDACTED]';
    if (entry.apiKey) entry.apiKey = '[REDACTED]';
    if (entry.authorization) entry.authorization = '[REDACTED]';

    return JSON.stringify(entry);
}

const logger = {
    error(message, meta = {}) {
        console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
    },

    warn(message, meta = {}) {
        console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
    },

    info(message, meta = {}) {
        console.log(formatLog(LOG_LEVELS.INFO, message, meta));
    },

    debug(message, meta = {}) {
        if (!isProduction) {
            console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
        }
    },

    // Log API requests (for important operations)
    request(req, action, meta = {}) {
        this.info(`API ${action}`, {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userId: req.headers['x-user-id'] || 'anonymous',
            ...meta
        });
    },

    // Log payment events (important for audit trail)
    payment(action, meta = {}) {
        this.info(`PAYMENT ${action}`, {
            category: 'payment',
            ...meta
        });
    },

    // Log authentication events
    auth(action, meta = {}) {
        this.info(`AUTH ${action}`, {
            category: 'auth',
            ...meta
        });
    },

    // Log errors with stack trace
    exception(error, context = {}) {
        this.error(error.message, {
            stack: error.stack,
            name: error.name,
            ...context
        });
    }
};

module.exports = logger;
