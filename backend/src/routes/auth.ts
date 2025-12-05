import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    tenantName: z.string().min(2),
    shopifyDomain: z.string().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            throw createError('Invalid input: ' + validation.error.message, 400, 'VALIDATION_ERROR');
        }

        const { email, password, name, tenantName, shopifyDomain } = validation.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw createError('User with this email already exists', 409, 'USER_EXISTS');
        }

        // Check if domain already exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { shopifyDomain },
        });

        if (existingTenant) {
            throw createError('A tenant with this Shopify domain already exists', 409, 'TENANT_EXISTS');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create tenant and user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    shopifyDomain: shopifyDomain.replace('.myshopify.com', ''),
                },
            });

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    tenantId: tenant.id,
                    role: 'admin',
                },
            });

            return { tenant, user };
        });

        // Generate JWT
        const token = jwt.sign(
            {
                userId: result.user.id,
                email: result.user.email,
                tenantId: result.tenant.id,
            },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                },
                tenant: {
                    id: result.tenant.id,
                    name: result.tenant.name,
                    shopifyDomain: result.tenant.shopifyDomain,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            throw createError('Invalid input', 400, 'VALIDATION_ERROR');
        }

        const { email, password } = validation.data;

        // Find user with tenant
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        shopifyDomain: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!user) {
            throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Check if tenant is active
        if (!user.tenant.isActive) {
            throw createError('Your account has been deactivated', 403, 'ACCOUNT_INACTIVE');
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenantId,
            },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                tenant: user.tenant,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        shopifyDomain: true,
                        isActive: true,
                        lastSyncAt: true,
                    },
                },
            },
        });

        if (!user) {
            throw createError('User not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };
