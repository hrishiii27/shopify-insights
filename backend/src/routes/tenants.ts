import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schema
const updateTenantSchema = z.object({
    name: z.string().min(2).optional(),
    shopifyApiKey: z.string().optional(),
    shopifySecret: z.string().optional(),
    accessToken: z.string().optional(),
});

// GET /api/tenants/current
router.get('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user!.tenantId },
            select: {
                id: true,
                name: true,
                shopifyDomain: true,
                isActive: true,
                lastSyncAt: true,
                createdAt: true,
                _count: {
                    select: {
                        customers: true,
                        orders: true,
                        products: true,
                    },
                },
            },
        });

        if (!tenant) {
            throw createError('Tenant not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: tenant,
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/tenants/current
router.put('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Only admins can update tenant
        if (req.user!.role !== 'admin') {
            throw createError('Only admins can update tenant settings', 403, 'FORBIDDEN');
        }

        const validation = updateTenantSchema.safeParse(req.body);
        if (!validation.success) {
            throw createError('Invalid input: ' + validation.error.message, 400, 'VALIDATION_ERROR');
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user!.tenantId },
            data: validation.data,
            select: {
                id: true,
                name: true,
                shopifyDomain: true,
                isActive: true,
                lastSyncAt: true,
            },
        });

        res.json({
            success: true,
            data: tenant,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/tenants/users
router.get('/users', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            where: { tenantId: req.user!.tenantId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
});

export { router as tenantsRouter };
