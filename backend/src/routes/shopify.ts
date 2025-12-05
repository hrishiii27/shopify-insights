import { Router, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { syncTenantData, SyncType } from '../services/shopifyService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/shopify/sync - Trigger manual sync
router.post('/sync', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const { type = 'all' } = req.body as { type?: SyncType | 'all' };

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw createError('Tenant not found', 404, 'NOT_FOUND');
        }

        if (!tenant.accessToken) {
            throw createError('Shopify not connected. Please provide access token.', 400, 'SHOPIFY_NOT_CONNECTED');
        }

        // Start sync in background
        const syncTypes: SyncType[] = type === 'all'
            ? ['customers', 'orders', 'products']
            : [type as SyncType];

        // Run sync asynchronously
        syncTenantData(tenantId, syncTypes).catch(console.error);

        res.json({
            success: true,
            message: `Sync started for: ${syncTypes.join(', ')}`,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/shopify/sync-status
router.get('/sync-status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;

        const logs = await prisma.syncLog.findMany({
            where: { tenantId },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { lastSyncAt: true },
        });

        res.json({
            success: true,
            data: {
                lastSyncAt: tenant?.lastSyncAt,
                recentLogs: logs,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/shopify/connect - Connect Shopify store with access token
router.post('/connect', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const { accessToken } = req.body;

        if (!accessToken) {
            throw createError('Access token is required', 400, 'VALIDATION_ERROR');
        }

        // Update tenant with access token
        const tenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: { accessToken },
            select: {
                id: true,
                name: true,
                shopifyDomain: true,
                isActive: true,
            },
        });

        res.json({
            success: true,
            data: tenant,
            message: 'Shopify connected successfully. You can now sync data.',
        });
    } catch (error) {
        next(error);
    }
});

export { router as shopifyRouter };
