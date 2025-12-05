import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

const router = Router();

// Verify Shopify webhook signature
function verifyWebhookSignature(body: Buffer, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const calculatedSignature = `sha256=${hmac.digest('base64')}`;
    return crypto.timingSafeEquals(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
    );
}

// POST /api/webhooks/shopify/:tenantId
router.post('/shopify/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.params;
        const topic = req.headers['x-shopify-topic'] as string;
        const signature = req.headers['x-shopify-hmac-sha256'] as string;

        // Get tenant to verify webhook
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            console.error(`Webhook received for unknown tenant: ${tenantId}`);
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Parse body (it's raw because of the middleware setup)
        const body = req.body as Buffer;
        const payload = JSON.parse(body.toString());

        // Log the event
        console.log(`Webhook received: ${topic} for tenant ${tenant.name}`);

        // Process based on topic
        switch (topic) {
            case 'customers/create':
            case 'customers/update':
                await handleCustomerWebhook(tenantId, payload);
                break;
            case 'orders/create':
            case 'orders/updated':
                await handleOrderWebhook(tenantId, payload);
                break;
            case 'products/create':
            case 'products/update':
                await handleProductWebhook(tenantId, payload);
                break;
            case 'carts/create':
            case 'carts/update':
                await handleCartEvent(tenantId, 'cart_updated', payload);
                break;
            case 'checkouts/create':
                await handleCartEvent(tenantId, 'checkout_started', payload);
                break;
            case 'checkouts/delete':
                await handleCartEvent(tenantId, 'cart_abandoned', payload);
                break;
            default:
                console.log(`Unhandled webhook topic: ${topic}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Still return 200 to prevent Shopify from retrying
        res.status(200).json({ received: true, error: 'Processing error' });
    }
});

async function handleCustomerWebhook(tenantId: string, payload: any) {
    await prisma.customer.upsert({
        where: {
            tenantId_shopifyId: {
                tenantId,
                shopifyId: String(payload.id),
            },
        },
        update: {
            email: payload.email,
            firstName: payload.first_name,
            lastName: payload.last_name,
            phone: payload.phone,
            tags: payload.tags,
            totalSpent: parseFloat(payload.total_spent || '0'),
            ordersCount: payload.orders_count || 0,
            updatedAt: new Date(),
        },
        create: {
            tenantId,
            shopifyId: String(payload.id),
            email: payload.email,
            firstName: payload.first_name,
            lastName: payload.last_name,
            phone: payload.phone,
            tags: payload.tags,
            totalSpent: parseFloat(payload.total_spent || '0'),
            ordersCount: payload.orders_count || 0,
            shopifyCreatedAt: payload.created_at ? new Date(payload.created_at) : null,
        },
    });
}

async function handleOrderWebhook(tenantId: string, payload: any) {
    // Find or create customer
    let customerId: string | null = null;
    if (payload.customer?.id) {
        const customer = await prisma.customer.findUnique({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: String(payload.customer.id),
                },
            },
        });
        customerId = customer?.id || null;
    }

    await prisma.order.upsert({
        where: {
            tenantId_shopifyId: {
                tenantId,
                shopifyId: String(payload.id),
            },
        },
        update: {
            totalPrice: parseFloat(payload.total_price || '0'),
            subtotalPrice: payload.subtotal_price ? parseFloat(payload.subtotal_price) : null,
            totalTax: payload.total_tax ? parseFloat(payload.total_tax) : null,
            totalDiscounts: payload.total_discounts ? parseFloat(payload.total_discounts) : null,
            financialStatus: payload.financial_status,
            fulfillmentStatus: payload.fulfillment_status,
            updatedAt: new Date(),
        },
        create: {
            tenantId,
            shopifyId: String(payload.id),
            orderNumber: payload.order_number?.toString() || payload.name,
            name: payload.name,
            totalPrice: parseFloat(payload.total_price || '0'),
            subtotalPrice: payload.subtotal_price ? parseFloat(payload.subtotal_price) : null,
            totalTax: payload.total_tax ? parseFloat(payload.total_tax) : null,
            totalDiscounts: payload.total_discounts ? parseFloat(payload.total_discounts) : null,
            currency: payload.currency || 'USD',
            financialStatus: payload.financial_status,
            fulfillmentStatus: payload.fulfillment_status,
            customerId,
            orderDate: new Date(payload.created_at),
        },
    });
}

async function handleProductWebhook(tenantId: string, payload: any) {
    const firstVariant = payload.variants?.[0];

    await prisma.product.upsert({
        where: {
            tenantId_shopifyId: {
                tenantId,
                shopifyId: String(payload.id),
            },
        },
        update: {
            title: payload.title,
            handle: payload.handle,
            vendor: payload.vendor,
            productType: payload.product_type,
            status: payload.status || 'active',
            tags: payload.tags,
            price: firstVariant ? parseFloat(firstVariant.price || '0') : 0,
            compareAtPrice: firstVariant?.compare_at_price
                ? parseFloat(firstVariant.compare_at_price)
                : null,
            inventory: firstVariant?.inventory_quantity || 0,
            imageUrl: payload.image?.src || payload.images?.[0]?.src,
            updatedAt: new Date(),
        },
        create: {
            tenantId,
            shopifyId: String(payload.id),
            title: payload.title,
            handle: payload.handle,
            vendor: payload.vendor,
            productType: payload.product_type,
            status: payload.status || 'active',
            tags: payload.tags,
            price: firstVariant ? parseFloat(firstVariant.price || '0') : 0,
            compareAtPrice: firstVariant?.compare_at_price
                ? parseFloat(firstVariant.compare_at_price)
                : null,
            inventory: firstVariant?.inventory_quantity || 0,
            imageUrl: payload.image?.src || payload.images?.[0]?.src,
            shopifyCreatedAt: payload.created_at ? new Date(payload.created_at) : null,
        },
    });
}

async function handleCartEvent(tenantId: string, eventType: string, payload: any) {
    await prisma.event.create({
        data: {
            tenantId,
            type: eventType,
            source: 'webhook',
            customerId: payload.customer?.id?.toString(),
            sessionId: payload.token,
            payload: payload,
        },
    });
}

export { router as webhooksRouter };
