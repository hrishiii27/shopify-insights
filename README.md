# 🛍️ Shopify Insights - Multi-Tenant Analytics Platform

A comprehensive multi-tenant data ingestion and analytics service for Shopify stores. Built with Node.js/Express backend and Next.js frontend.

![Dashboard Preview](docs/dashboard-preview.png)

## ✨ Features

- **Multi-Tenant Architecture**: Secure data isolation for multiple Shopify stores
- **Real-Time Data Sync**: Webhooks and scheduled sync for up-to-date data
- **Analytics Dashboard**: Beautiful visualizations powered by Recharts
- **Email Authentication**: JWT-based auth with secure session management
- **Shopify Integration**: Full API integration for customers, orders, and products

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js        │────▶│  Express.js     │────▶│  PostgreSQL     │
│  Frontend       │     │  Backend        │     │  Database       │
│  (Vercel)       │     │  (Render)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │  Shopify API    │
                        │                 │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Shopify development store (optional for demo)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database URL and secrets
# DATABASE_URL="postgresql://user:password@localhost:5432/shopify_insights"
# JWT_SECRET="your-secret-key"

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data (optional)
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Start development server
npm run dev
```

### Demo Credentials

After seeding the database:
- **Email**: demo@example.com
- **Password**: demo123

## 📊 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user with tenant |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Get current user info |

### Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insights/summary` | Dashboard summary metrics |
| GET | `/api/insights/orders-by-date` | Orders with date range filter |
| GET | `/api/insights/top-customers` | Top customers by spend |
| GET | `/api/insights/trends` | Revenue/orders trends |
| GET | `/api/insights/recent-orders` | Recent order list |
| GET | `/api/insights/products` | Product catalog |

### Shopify Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shopify/connect` | Connect Shopify store |
| POST | `/api/shopify/sync` | Trigger manual sync |
| GET | `/api/shopify/sync-status` | Get sync status/logs |
| POST | `/api/webhooks/shopify/:tenantId` | Webhook receiver |

## 🗄️ Database Schema

### Core Tables

- **Tenant**: Multi-tenant container with Shopify credentials
- **User**: Authenticated users linked to tenants
- **Customer**: Synced customer data from Shopify
- **Order**: Orders with line items
- **Product**: Product catalog
- **Event**: Custom events (cart abandoned, etc.)
- **SyncLog**: Sync operation history

### Entity Relationships

```
Tenant (1) ─── (N) User
Tenant (1) ─── (N) Customer
Tenant (1) ─── (N) Order
Tenant (1) ─── (N) Product
Tenant (1) ─── (N) Event
Customer (1) ─── (N) Order
Order (1) ─── (N) OrderLineItem
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📦 Deployment

### Backend (Render)

1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install && npm run db:generate && npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Frontend (Vercel)

1. Import project from GitHub
2. Set root directory to `frontend`
3. Add `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

### Database (Render/Supabase)

1. Create PostgreSQL instance
2. Copy connection string to backend's `DATABASE_URL`

## 🔒 Security Features

- JWT token authentication with expiration
- Password hashing with bcrypt (12 rounds)
- Tenant data isolation via foreign keys
- CORS configuration for frontend origin
- Webhook signature verification (Shopify HMAC)

## ⚠️ Known Limitations

1. **Shopify OAuth**: Currently uses access token input instead of full OAuth flow
2. **Pagination**: API responses limited to 250 items per sync
3. **Real-time**: No WebSocket support for live updates
4. **Rate Limiting**: No built-in rate limiting for API endpoints

## 🔮 Next Steps for Production

1. **Add OAuth Flow**: Implement proper Shopify OAuth for secure token exchange
2. **Redis Caching**: Add Redis for session management and API caching
3. **Message Queue**: Use RabbitMQ/Bull for async job processing
4. **Rate Limiting**: Implement API rate limiting with Redis
5. **Logging & Monitoring**: Add structured logging and APM integration
6. **Testing**: Add comprehensive unit and integration tests
7. **CI/CD**: Set up GitHub Actions for automated testing and deployment

## 📄 License

MIT License - feel free to use this project for learning and development.

---

Built with ❤️ for the Xeno Assignment
