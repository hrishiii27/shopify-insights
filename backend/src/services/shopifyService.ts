import prisma from '../lib/prisma.js';

export type SyncType = 'customers' | 'orders' | 'products';

interface ShopifyConfig {
    domain: string;
    accessToken: string;
}

// Make a request to Shopify Admin API
async function shopifyRequest(
    config: ShopifyConfig,
    endpoint: string,
    params: Record<string, string> = {}
): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const url = `https://${config.domain}.myshopify.com/admin/api/2024-01/${endpoint}.json${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
        headers: {
            'X-Shopify-Access-Token': config.accessToken,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    return response.json();
}

// Sync customers from Shopify
async function syncCustomers(tenantId: string, config: ShopifyConfig): Promise<number> {
    let count = 0;
    let pageInfo: string | undefined;

    do {
        const params: Record<string, string> = { limit: '250' };
        if (pageInfo) {
            params.page_info = pageInfo;
        }

        const response = await shopifyRequest(config, 'customers', params);
        const customers = response.customers || [];

        for (const customer of customers) {
            await prisma.customer.upsert({
                where: {
                    tenantId_shopifyId: {
                        tenantId,
                        shopifyId: String(customer.id),
                    },
                },
                update: {
                    email: customer.email,
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    phone: customer.phone,
                    tags: customer.tags,
                    totalSpent: parseFloat(customer.total_spent || '0'),
                    ordersCount: customer.orders_count || 0,
                    updatedAt: new Date(),
                },
                create: {
                    tenantId,
                    shopifyId: String(customer.id),
                    email: customer.email,
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    phone: customer.phone,
                    tags: customer.tags,
                    totalSpent: parseFloat(customer.total_spent || '0'),
                    ordersCount: customer.orders_count || 0,
                    shopifyCreatedAt: customer.created_at ? new Date(customer.created_at) : null,
                },
            });
            count++;
        }

        // Handle pagination using Link header
        // For simplicity, we'll stop after first page in this implementation
        pageInfo = undefined;
    } while (pageInfo);

    return count;
}

// Sync orders from Shopify
async function syncOrders(tenantId: string, config: ShopifyConfig): Promise<number> {
    let count = 0;

    const response = await shopifyRequest(config, 'orders', {
        limit: '250',
        status: 'any',
    });
    const orders = response.orders || [];

    for (const order of orders) {
        // Create or update customer from order data
        let customerId: string | null = null;
        if (order.customer?.id) {
            // Upsert customer with data from the order
            const customerData = order.customer;
            const upsertedCustomer = await prisma.customer.upsert({
                where: {
                    tenantId_shopifyId: {
                        tenantId,
                        shopifyId: String(customerData.id),
                    },
                },
                update: {
                    email: customerData.email || undefined,
                    firstName: customerData.first_name || customerData.default_address?.first_name || undefined,
                    lastName: customerData.last_name || customerData.default_address?.last_name || undefined,
                    phone: customerData.phone || customerData.default_address?.phone || undefined,
                    updatedAt: new Date(),
                },
                create: {
                    tenantId,
                    shopifyId: String(customerData.id),
                    email: customerData.email,
                    firstName: customerData.first_name || customerData.default_address?.first_name,
                    lastName: customerData.last_name || customerData.default_address?.last_name,
                    phone: customerData.phone || customerData.default_address?.phone,
                    totalSpent: 0,
                    ordersCount: 0,
                },
            });
            customerId = upsertedCustomer.id;
        }

        const savedOrder = await prisma.order.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: String(order.id),
                },
            },
            update: {
                totalPrice: parseFloat(order.total_price || '0'),
                subtotalPrice: order.subtotal_price ? parseFloat(order.subtotal_price) : null,
                totalTax: order.total_tax ? parseFloat(order.total_tax) : null,
                totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : null,
                financialStatus: order.financial_status,
                fulfillmentStatus: order.fulfillment_status,
                customerId,
                updatedAt: new Date(),
            },
            create: {
                tenantId,
                shopifyId: String(order.id),
                orderNumber: order.order_number?.toString() || order.name,
                name: order.name,
                totalPrice: parseFloat(order.total_price || '0'),
                subtotalPrice: order.subtotal_price ? parseFloat(order.subtotal_price) : null,
                totalTax: order.total_tax ? parseFloat(order.total_tax) : null,
                totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : null,
                currency: order.currency || 'USD',
                financialStatus: order.financial_status,
                fulfillmentStatus: order.fulfillment_status,
                customerId,
                orderDate: new Date(order.created_at),
            },
        });

        // Sync line items
        if (order.line_items) {
            // Delete existing line items and recreate
            await prisma.orderLineItem.deleteMany({
                where: { orderId: savedOrder.id },
            });

            for (const item of order.line_items) {
                await prisma.orderLineItem.create({
                    data: {
                        shopifyId: String(item.id),
                        orderId: savedOrder.id,
                        productId: item.product_id?.toString(),
                        title: item.title,
                        quantity: item.quantity,
                        price: parseFloat(item.price || '0'),
                        sku: item.sku,
                        variantId: item.variant_id?.toString(),
                    },
                });
            }
        }

        count++;
    }

    return count;
}

// Sync products from Shopify
async function syncProducts(tenantId: string, config: ShopifyConfig): Promise<number> {
    let count = 0;

    const response = await shopifyRequest(config, 'products', { limit: '250' });
    const products = response.products || [];

    for (const product of products) {
        const firstVariant = product.variants?.[0];

        await prisma.product.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: String(product.id),
                },
            },
            update: {
                title: product.title,
                handle: product.handle,
                vendor: product.vendor,
                productType: product.product_type,
                status: product.status || 'active',
                tags: product.tags,
                price: firstVariant ? parseFloat(firstVariant.price || '0') : 0,
                compareAtPrice: firstVariant?.compare_at_price
                    ? parseFloat(firstVariant.compare_at_price)
                    : null,
                inventory: firstVariant?.inventory_quantity || 0,
                imageUrl: product.image?.src || product.images?.[0]?.src,
                updatedAt: new Date(),
            },
            create: {
                tenantId,
                shopifyId: String(product.id),
                title: product.title,
                handle: product.handle,
                vendor: product.vendor,
                productType: product.product_type,
                status: product.status || 'active',
                tags: product.tags,
                price: firstVariant ? parseFloat(firstVariant.price || '0') : 0,
                compareAtPrice: firstVariant?.compare_at_price
                    ? parseFloat(firstVariant.compare_at_price)
                    : null,
                inventory: firstVariant?.inventory_quantity || 0,
                imageUrl: product.image?.src || product.images?.[0]?.src,
                shopifyCreatedAt: product.created_at ? new Date(product.created_at) : null,
            },
        });
        count++;
    }

    return count;
}

// Main sync function
export async function syncTenantData(
    tenantId: string,
    types: SyncType[] = ['customers', 'orders', 'products']
): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
    });

    if (!tenant || !tenant.accessToken) {
        throw new Error('Tenant not found or Shopify not connected');
    }

    const config: ShopifyConfig = {
        domain: tenant.shopifyDomain,
        accessToken: tenant.accessToken,
    };

    for (const type of types) {
        // Create sync log
        const syncLog = await prisma.syncLog.create({
            data: {
                tenantId,
                type,
                status: 'running',
            },
        });

        try {
            let count = 0;

            switch (type) {
                case 'customers':
                    count = await syncCustomers(tenantId, config);
                    break;
                case 'orders':
                    count = await syncOrders(tenantId, config);
                    break;
                case 'products':
                    count = await syncProducts(tenantId, config);
                    break;
            }

            // Update sync log
            await prisma.syncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: 'completed',
                    itemCount: count,
                    completedAt: new Date(),
                },
            });

            console.log(`Synced ${count} ${type} for tenant ${tenant.name}`);
        } catch (error) {
            // Update sync log with error
            await prisma.syncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    completedAt: new Date(),
                },
            });

            console.error(`Error syncing ${type} for tenant ${tenant.name}:`, error);
        }
    }

    // Update last sync time
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { lastSyncAt: new Date() },
    });
}

// Sync all active tenants
export async function syncAllTenants(): Promise<void> {
    const tenants = await prisma.tenant.findMany({
        where: {
            isActive: true,
            accessToken: { not: null },
        },
    });

    console.log(`Starting sync for ${tenants.length} tenants...`);

    for (const tenant of tenants) {
        try {
            await syncTenantData(tenant.id);
        } catch (error) {
            console.error(`Error syncing tenant ${tenant.name}:`, error);
        }
    }
}
