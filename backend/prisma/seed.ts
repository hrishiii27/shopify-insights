import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create a demo tenant
    const tenant = await prisma.tenant.upsert({
        where: { shopifyDomain: 'demo-store' },
        update: {},
        create: {
            name: 'Demo Store',
            shopifyDomain: 'demo-store',
            isActive: true,
        },
    });

    console.log('Created tenant:', tenant.name);

    // Create a demo user
    const hashedPassword = await bcrypt.hash('demo123', 12);
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            password: hashedPassword,
            name: 'Demo User',
            role: 'admin',
            tenantId: tenant.id,
        },
    });

    console.log('Created user:', user.email);

    // Create demo customers
    const customerData = [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', totalSpent: 1250.00, ordersCount: 5 },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', totalSpent: 890.50, ordersCount: 3 },
        { firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', totalSpent: 2100.00, ordersCount: 8 },
        { firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', totalSpent: 450.25, ordersCount: 2 },
        { firstName: 'Charlie', lastName: 'Davis', email: 'charlie@example.com', totalSpent: 3200.75, ordersCount: 12 },
        { firstName: 'Eva', lastName: 'Martinez', email: 'eva@example.com', totalSpent: 780.00, ordersCount: 4 },
        { firstName: 'Frank', lastName: 'Garcia', email: 'frank@example.com', totalSpent: 560.50, ordersCount: 3 },
        { firstName: 'Grace', lastName: 'Lee', email: 'grace@example.com', totalSpent: 1890.25, ordersCount: 7 },
    ];

    const customers = [];
    for (let i = 0; i < customerData.length; i++) {
        const data = customerData[i];
        const customer = await prisma.customer.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId: tenant.id,
                    shopifyId: `demo-customer-${i + 1}`,
                },
            },
            update: data,
            create: {
                tenantId: tenant.id,
                shopifyId: `demo-customer-${i + 1}`,
                ...data,
            },
        });
        customers.push(customer);
    }

    console.log(`Created ${customers.length} customers`);

    // Create demo products
    const productData = [
        { title: 'Premium T-Shirt', vendor: 'Fashion Co', productType: 'Apparel', price: 29.99, inventory: 150 },
        { title: 'Wireless Headphones', vendor: 'Tech Gear', productType: 'Electronics', price: 89.99, inventory: 50 },
        { title: 'Running Shoes', vendor: 'Sport Pro', productType: 'Footwear', price: 129.99, inventory: 75 },
        { title: 'Organic Coffee Beans', vendor: 'Bean Masters', productType: 'Food & Beverage', price: 24.99, inventory: 200 },
        { title: 'Yoga Mat', vendor: 'Fitness Plus', productType: 'Sports', price: 45.00, inventory: 100 },
        { title: 'Smart Watch', vendor: 'Tech Gear', productType: 'Electronics', price: 199.99, inventory: 30 },
        { title: 'Leather Wallet', vendor: 'Fashion Co', productType: 'Accessories', price: 59.99, inventory: 80 },
        { title: 'Water Bottle', vendor: 'Eco Life', productType: 'Accessories', price: 19.99, inventory: 250 },
    ];

    const products = [];
    for (let i = 0; i < productData.length; i++) {
        const data = productData[i];
        const product = await prisma.product.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId: tenant.id,
                    shopifyId: `demo-product-${i + 1}`,
                },
            },
            update: data,
            create: {
                tenantId: tenant.id,
                shopifyId: `demo-product-${i + 1}`,
                ...data,
            },
        });
        products.push(product);
    }

    console.log(`Created ${products.length} products`);

    // Create demo orders for the last 30 days
    const orders = [];
    const statuses = ['paid', 'pending', 'refunded'];
    const fulfillmentStatuses = ['fulfilled', 'unfulfilled', 'partial'];

    for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);
        orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const customer = customers[Math.floor(Math.random() * customers.length)];
        const totalPrice = 50 + Math.random() * 250;

        const order = await prisma.order.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId: tenant.id,
                    shopifyId: `demo-order-${i + 1}`,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                shopifyId: `demo-order-${i + 1}`,
                orderNumber: `${1000 + i}`,
                name: `#${1000 + i}`,
                totalPrice: Math.round(totalPrice * 100) / 100,
                subtotalPrice: Math.round((totalPrice * 0.9) * 100) / 100,
                totalTax: Math.round((totalPrice * 0.1) * 100) / 100,
                currency: 'USD',
                financialStatus: statuses[Math.floor(Math.random() * statuses.length)],
                fulfillmentStatus: fulfillmentStatuses[Math.floor(Math.random() * fulfillmentStatuses.length)],
                customerId: customer.id,
                orderDate,
            },
        });
        orders.push(order);
    }

    console.log(`Created ${orders.length} orders`);

    // Create some demo events
    const eventTypes = ['cart_abandoned', 'checkout_started', 'product_viewed'];
    for (let i = 0; i < 20; i++) {
        await prisma.event.create({
            data: {
                tenantId: tenant.id,
                type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                source: 'demo',
                customerId: customers[Math.floor(Math.random() * customers.length)].shopifyId,
                payload: { demo: true },
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            },
        });
    }

    console.log('Created 20 events');

    console.log('✅ Seed completed successfully!');
    console.log('\nDemo credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: demo123');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
