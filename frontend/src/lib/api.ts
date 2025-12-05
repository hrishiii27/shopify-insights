const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        message: string;
        code: string;
    };
}

class ApiClient {
    private getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const result = await response.json() as ApiResponse<T>;

        if (!response.ok) {
            throw new Error(result.error?.message || result.message || 'An error occurred');
        }

        // Handle both data and message responses
        if (result.data !== undefined) {
            return result.data;
        }

        // For responses that only have message (like sync), return the whole result
        return result as unknown as T;
    }

    // Insights endpoints
    async getSummary() {
        return this.request<{
            totals: {
                customers: number;
                orders: number;
                products: number;
                revenue: number;
            };
            today: {
                orders: number;
                revenue: number;
            };
            thisMonth: {
                orders: number;
                revenue: number;
                newCustomers: number;
            };
        }>('/api/insights/summary');
    }

    async getOrdersByDate(startDate?: string, endDate?: string) {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        return this.request<Array<{
            date: string;
            orders: number;
            revenue: number;
        }>>(`/api/insights/orders-by-date?${params}`);
    }

    async getTopCustomers(limit = 5) {
        return this.request<Array<{
            id: string;
            email: string | null;
            name: string;
            totalSpent: number;
            ordersCount: number;
        }>>(`/api/insights/top-customers?limit=${limit}`);
    }

    async getTrends(days = 30) {
        return this.request<{
            daily: Array<{
                date: string;
                orders: number;
                revenue: number;
                customers: number;
            }>;
            averages: {
                ordersPerDay: number;
                revenuePerDay: number;
            };
        }>(`/api/insights/trends?days=${days}`);
    }

    async getRecentOrders(limit = 10) {
        return this.request<Array<{
            id: string;
            orderNumber: string;
            name: string;
            totalPrice: number;
            currency: string;
            financialStatus: string;
            fulfillmentStatus: string;
            orderDate: string;
            customerName: string;
        }>>(`/api/insights/recent-orders?limit=${limit}`);
    }

    async getProducts(limit = 10) {
        return this.request<Array<{
            id: string;
            title: string;
            vendor: string | null;
            productType: string | null;
            price: number;
            inventory: number;
            imageUrl: string | null;
        }>>(`/api/insights/products?limit=${limit}`);
    }

    async getRevenueByProductType() {
        return this.request<Array<{
            type: string;
            count: number;
        }>>('/api/insights/revenue-by-product-type');
    }

    // Shopify endpoints
    async triggerSync(type: 'customers' | 'orders' | 'products' | 'all' = 'all') {
        return this.request<{ message: string }>('/api/shopify/sync', {
            method: 'POST',
            body: JSON.stringify({ type }),
        });
    }

    async getSyncStatus() {
        return this.request<{
            lastSyncAt: string | null;
            recentLogs: Array<{
                id: string;
                type: string;
                status: string;
                itemCount: number;
                error: string | null;
                startedAt: string;
                completedAt: string | null;
            }>;
        }>('/api/shopify/sync-status');
    }

    async connectShopify(accessToken: string) {
        return this.request<{
            id: string;
            name: string;
            shopifyDomain: string;
            isActive: boolean;
        }>('/api/shopify/connect', {
            method: 'POST',
            body: JSON.stringify({ accessToken }),
        });
    }

    // Tenant endpoints
    async getCurrentTenant() {
        return this.request<{
            id: string;
            name: string;
            shopifyDomain: string;
            isActive: boolean;
            lastSyncAt: string | null;
            createdAt: string;
            _count: {
                customers: number;
                orders: number;
                products: number;
            };
        }>('/api/tenants/current');
    }

    // ===== Novel Features =====

    // RFM Customer Segmentation
    async getRFMSegments() {
        return this.request<{
            segments: Array<{
                segment: string;
                count: number;
                totalValue: number;
                avgValue: number;
                topCustomers: Array<{
                    name: string;
                    email: string | null;
                    totalSpent: number;
                    ordersCount: number;
                    daysSinceLastOrder: number;
                    rfmScore: number;
                }>;
            }>;
            totalCustomers: number;
        }>('/api/insights/rfm-segments');
    }

    // Revenue Forecasting
    async getRevenueForecast() {
        return this.request<{
            historical: Array<{
                date: string;
                revenue: number;
                orders: number;
            }>;
            forecast: Array<{
                date: string;
                predictedRevenue: number;
                confidence: number;
            }>;
            trend: string;
            weeklyGrowth: number;
            avgDailyRevenue: number;
            predictedWeeklyRevenue: number;
        }>('/api/insights/revenue-forecast');
    }
}

export const api = new ApiClient();

