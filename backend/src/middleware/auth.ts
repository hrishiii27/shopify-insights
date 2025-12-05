import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { createError } from './errorHandler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        tenantId: string;
        role: string;
    };
}

export async function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('No token provided', 401, 'UNAUTHORIZED');
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw createError('JWT secret not configured', 500, 'CONFIG_ERROR');
        }

        const decoded = jwt.verify(token, jwtSecret) as {
            userId: string;
            email: string;
            tenantId: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                tenantId: true,
                role: true,
            },
        });

        if (!user) {
            throw createError('User not found', 401, 'UNAUTHORIZED');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(createError('Invalid token', 401, 'INVALID_TOKEN'));
        }
        next(error);
    }
}
