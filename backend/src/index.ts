import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { tenantsRouter } from './routes/tenants.js';
import { insightsRouter } from './routes/insights.js';
import { shopifyRouter } from './routes/shopify.js';
import { webhooksRouter } from './routes/webhooks.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Webhooks need raw body for verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/shopify', shopifyRouter);
app.use('/api/webhooks', webhooksRouter);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Start background sync scheduler
    if (process.env.NODE_ENV !== 'test') {
        startScheduler();
    }
});

export default app;
