import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Query schema for date filtering
const dateRangeSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

// GET /api/insights/summary
router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;

        // Get counts and totals
        const [customerCount, orderCount, productCount, revenueResult] = await Promise.all([
            prisma.customer.count({ where: { tenantId } }),
            prisma.order.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId } }),
            prisma.order.aggregate({
                where: { tenantId },
                _sum: { totalPrice: true },
            }),
        ]);

        const totalRevenue = revenueResult._sum.totalPrice || 0;

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayOrders, todayRevenue] = await Promise.all([
            prisma.order.count({
                where: {
                    tenantId,
                    orderDate: { gte: today },
                },
            }),
            prisma.order.aggregate({
                where: {
                    tenantId,
                    orderDate: { gte: today },
                },
                _sum: { totalPrice: true },
            }),
        ]);

        // Get this month's stats
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const [monthOrders, monthRevenue, monthCustomers] = await Promise.all([
            prisma.order.count({
                where: {
                    tenantId,
                    orderDate: { gte: monthStart },
                },
            }),
            prisma.order.aggregate({
                where: {
                    tenantId,
                    orderDate: { gte: monthStart },
                },
                _sum: { totalPrice: true },
            }),
            prisma.customer.count({
                where: {
                    tenantId,
                    createdAt: { gte: monthStart },
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                totals: {
                    customers: customerCount,
                    orders: orderCount,
                    products: productCount,
                    revenue: Number(totalRevenue),
                },
                today: {
                    orders: todayOrders,
                    revenue: Number(todayRevenue._sum.totalPrice || 0),
                },
                thisMonth: {
                    orders: monthOrders,
                    revenue: Number(monthRevenue._sum.totalPrice || 0),
                    newCustomers: monthCustomers,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/orders-by-date
router.get('/orders-by-date', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const { startDate, endDate } = dateRangeSchema.parse(req.query);

        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        const orders = await prisma.order.groupBy({
            by: ['orderDate'],
            where: {
                tenantId,
                orderDate: {
                    gte: start,
                    lte: end,
                },
            },
            _count: { id: true },
            _sum: { totalPrice: true },
            orderBy: { orderDate: 'asc' },
        });

        // Format data for chart
        const chartData = orders.map((o) => ({
            date: o.orderDate.toISOString().split('T')[0],
            orders: o._count.id,
            revenue: Number(o._sum.totalPrice || 0),
        }));

        res.json({
            success: true,
            data: chartData,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/top-customers
router.get('/top-customers', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

        const customers = await prisma.customer.findMany({
            where: { tenantId },
            orderBy: { totalSpent: 'desc' },
            take: limit,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                totalSpent: true,
                ordersCount: true,
            },
        });

        const formattedCustomers = customers.map((c) => ({
            ...c,
            totalSpent: Number(c.totalSpent),
            name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown',
        }));

        res.json({
            success: true,
            data: formattedCustomers,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/trends
router.get('/trends', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const days = Math.min(parseInt(req.query.days as string) || 30, 90);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Get daily aggregates using raw query for better performance
        const dailyStats = await prisma.$queryRaw<Array<{
            date: Date;
            order_count: bigint;
            total_revenue: Prisma.Decimal | null;
            customer_count: bigint;
        }>>`
      SELECT 
        DATE(o."orderDate") as date,
        COUNT(o.id) as order_count,
        SUM(o."totalPrice") as total_revenue,
        COUNT(DISTINCT o."customerId") as customer_count
      FROM "Order" o
      WHERE o."tenantId" = ${tenantId}
        AND o."orderDate" >= ${startDate}
      GROUP BY DATE(o."orderDate")
      ORDER BY date ASC
    `;

        const trendData = dailyStats.map((d) => ({
            date: d.date.toISOString().split('T')[0],
            orders: Number(d.order_count),
            revenue: Number(d.total_revenue || 0),
            customers: Number(d.customer_count),
        }));

        // Calculate averages
        const avgOrders = trendData.length > 0
            ? trendData.reduce((sum, d) => sum + d.orders, 0) / trendData.length
            : 0;
        const avgRevenue = trendData.length > 0
            ? trendData.reduce((sum, d) => sum + d.revenue, 0) / trendData.length
            : 0;

        res.json({
            success: true,
            data: {
                daily: trendData,
                averages: {
                    ordersPerDay: Math.round(avgOrders * 100) / 100,
                    revenuePerDay: Math.round(avgRevenue * 100) / 100,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/products
router.get('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const products = await prisma.product.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                title: true,
                vendor: true,
                productType: true,
                price: true,
                inventory: true,
                imageUrl: true,
            },
        });

        const formattedProducts = products.map((p) => ({
            ...p,
            price: Number(p.price),
        }));

        res.json({
            success: true,
            data: formattedProducts,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/recent-orders
router.get('/recent-orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const orders = await prisma.order.findMany({
            where: { tenantId },
            orderBy: { orderDate: 'desc' },
            take: limit,
            select: {
                id: true,
                orderNumber: true,
                name: true,
                totalPrice: true,
                currency: true,
                financialStatus: true,
                fulfillmentStatus: true,
                orderDate: true,
                customer: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        const formattedOrders = orders.map((o) => ({
            ...o,
            totalPrice: Number(o.totalPrice),
            customerName: o.customer
                ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ') || o.customer.email
                : 'Guest',
        }));

        res.json({
            success: true,
            data: formattedOrders,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/insights/revenue-by-product-type
router.get('/revenue-by-product-type', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;

        const productTypes = await prisma.product.groupBy({
            by: ['productType'],
            where: { tenantId },
            _count: { id: true },
        });

        const data = productTypes.map((p) => ({
            type: p.productType || 'Uncategorized',
            count: p._count.id,
        }));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
});

// ========== NOVEL FEATURE 1: RFM Customer Segmentation ==========
// Analyzes customers based on Recency, Frequency, and Monetary value
router.get('/rfm-segments', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;

        // Get all customers with their order data
        const customers = await prisma.customer.findMany({
            where: { tenantId },
            include: {
                orders: {
                    orderBy: { orderDate: 'desc' },
                    take: 1,
                    select: { orderDate: true },
                },
            },
        });

        const now = new Date();
        const segments: Record<string, { count: number; totalValue: number; customers: any[] }> = {
            'Champions': { count: 0, totalValue: 0, customers: [] },
            'Loyal Customers': { count: 0, totalValue: 0, customers: [] },
            'Potential Loyalists': { count: 0, totalValue: 0, customers: [] },
            'Recent Customers': { count: 0, totalValue: 0, customers: [] },
            'Promising': { count: 0, totalValue: 0, customers: [] },
            'Need Attention': { count: 0, totalValue: 0, customers: [] },
            'At Risk': { count: 0, totalValue: 0, customers: [] },
            'Hibernating': { count: 0, totalValue: 0, customers: [] },
        };

        for (const customer of customers) {
            const lastOrderDate = customer.orders[0]?.orderDate;
            const daysSinceLastOrder = lastOrderDate
                ? Math.floor((now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                : 999;

            const frequency = customer.ordersCount;
            const monetary = Number(customer.totalSpent);

            // RFM Scoring (1-5 scale)
            const recencyScore = daysSinceLastOrder <= 7 ? 5 : daysSinceLastOrder <= 30 ? 4 : daysSinceLastOrder <= 90 ? 3 : daysSinceLastOrder <= 180 ? 2 : 1;
            const frequencyScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
            const monetaryScore = monetary >= 1000 ? 5 : monetary >= 500 ? 4 : monetary >= 200 ? 3 : monetary >= 50 ? 2 : 1;

            // Segment assignment based on RFM scores
            let segment: string;
            const rfmScore = recencyScore + frequencyScore + monetaryScore;

            if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
                segment = 'Champions';
            } else if (frequencyScore >= 4 && monetaryScore >= 3) {
                segment = 'Loyal Customers';
            } else if (recencyScore >= 4 && frequencyScore >= 2) {
                segment = 'Potential Loyalists';
            } else if (recencyScore >= 4 && frequencyScore === 1) {
                segment = 'Recent Customers';
            } else if (recencyScore >= 3 && monetaryScore >= 2) {
                segment = 'Promising';
            } else if (recencyScore <= 2 && frequencyScore >= 3) {
                segment = 'Need Attention';
            } else if (recencyScore <= 2 && frequencyScore >= 2) {
                segment = 'At Risk';
            } else {
                segment = 'Hibernating';
            }

            segments[segment].count++;
            segments[segment].totalValue += monetary;
            if (segments[segment].customers.length < 3) {
                segments[segment].customers.push({
                    name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Unknown',
                    email: customer.email,
                    totalSpent: monetary,
                    ordersCount: frequency,
                    daysSinceLastOrder,
                    rfmScore,
                });
            }
        }

        const segmentData = Object.entries(segments).map(([name, data]) => ({
            segment: name,
            count: data.count,
            totalValue: Math.round(data.totalValue * 100) / 100,
            avgValue: data.count > 0 ? Math.round((data.totalValue / data.count) * 100) / 100 : 0,
            topCustomers: data.customers,
        })).filter(s => s.count > 0);

        res.json({
            success: true,
            data: {
                segments: segmentData,
                totalCustomers: customers.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ========== NOVEL FEATURE 2: Revenue Forecasting ==========
// Predicts next 7 days revenue based on historical trends
router.get('/revenue-forecast', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user!.tenantId;

        // Get last 30 days of revenue data
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const dailyRevenue = await prisma.$queryRaw<Array<{
            date: Date;
            revenue: Prisma.Decimal | null;
            order_count: bigint;
        }>>`
            SELECT 
                DATE(o."orderDate") as date,
                SUM(o."totalPrice") as revenue,
                COUNT(o.id) as order_count
            FROM "Order" o
            WHERE o."tenantId" = ${tenantId}
                AND o."orderDate" >= ${startDate}
            GROUP BY DATE(o."orderDate")
            ORDER BY date ASC
        `;

        // Calculate moving averages and trends
        const historicalData = dailyRevenue.map(d => ({
            date: d.date.toISOString().split('T')[0],
            revenue: Number(d.revenue || 0),
            orders: Number(d.order_count),
        }));

        // Simple linear regression for trend
        const n = historicalData.length;
        if (n < 7) {
            return res.json({
                success: true,
                data: {
                    historical: historicalData,
                    forecast: [],
                    trend: 'insufficient_data',
                    confidence: 0,
                },
            });
        }

        // Calculate trend using linear regression
        const xMean = (n - 1) / 2;
        const yMean = historicalData.reduce((sum, d) => sum + d.revenue, 0) / n;

        let numerator = 0;
        let denominator = 0;
        historicalData.forEach((d, i) => {
            numerator += (i - xMean) * (d.revenue - yMean);
            denominator += (i - xMean) * (i - xMean);
        });

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = yMean - slope * xMean;

        // Generate 7-day forecast
        const forecast: Array<{ date: string; predictedRevenue: number; confidence: number }> = [];
        const lastDate = new Date(historicalData[n - 1].date);

        // Calculate variance for confidence intervals
        const residuals = historicalData.map((d, i) => d.revenue - (intercept + slope * i));
        const variance = residuals.reduce((sum, r) => sum + r * r, 0) / n;
        const stdDev = Math.sqrt(variance);

        for (let i = 1; i <= 7; i++) {
            const forecastDate = new Date(lastDate);
            forecastDate.setDate(forecastDate.getDate() + i);

            const predicted = intercept + slope * (n - 1 + i);
            const confidence = Math.max(0, Math.min(100, 100 - (stdDev / yMean * 100 * 0.5)));

            forecast.push({
                date: forecastDate.toISOString().split('T')[0],
                predictedRevenue: Math.max(0, Math.round(predicted * 100) / 100),
                confidence: Math.round(confidence),
            });
        }

        // Determine trend direction
        const trendDirection = slope > yMean * 0.01 ? 'growing' : slope < -yMean * 0.01 ? 'declining' : 'stable';
        const weeklyGrowth = n > 7
            ? ((historicalData.slice(-7).reduce((s, d) => s + d.revenue, 0) /
                historicalData.slice(-14, -7).reduce((s, d) => s + d.revenue, 0)) - 1) * 100
            : 0;

        res.json({
            success: true,
            data: {
                historical: historicalData,
                forecast,
                trend: trendDirection,
                weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
                avgDailyRevenue: Math.round(yMean * 100) / 100,
                predictedWeeklyRevenue: Math.round(forecast.reduce((sum, f) => sum + f.predictedRevenue, 0) * 100) / 100,
            },
        });
    } catch (error) {
        next(error);
    }
});

export { router as insightsRouter };

