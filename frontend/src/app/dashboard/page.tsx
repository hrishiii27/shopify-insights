'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';

interface Summary {
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
}

interface TopCustomer {
    id: string;
    email: string | null;
    name: string;
    totalSpent: number;
    ordersCount: number;
}

interface TrendData {
    date: string;
    orders: number;
    revenue: number;
    customers: number;
}

interface RecentOrder {
    id: string;
    orderNumber: string;
    name: string;
    totalPrice: number;
    currency: string;
    financialStatus: string;
    fulfillmentStatus: string;
    orderDate: string;
    customerName: string;
}

export default function DashboardPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [summaryData, customersData, trendsData, ordersData] = await Promise.all([
                api.getSummary(),
                api.getTopCustomers(5),
                api.getTrends(30),
                api.getRecentOrders(5),
            ]);

            setSummary(summaryData);
            setTopCustomers(customersData);
            setTrends(trendsData.daily);
            setRecentOrders(ordersData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    if (isLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of your store performance</p>
                </div>
                <button onClick={loadData} className="btn btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                <div className="card metric-card">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="metric-label">Total Revenue</p>
                            <p className="metric-value">{formatCurrency(summary?.totals.revenue || 0)}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                {formatCurrency(summary?.thisMonth.revenue || 0)} this month
                            </p>
                        </div>
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card metric-card">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="metric-label">Total Orders</p>
                            <p className="metric-value">{formatNumber(summary?.totals.orders || 0)}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                {formatNumber(summary?.thisMonth.orders || 0)} this month
                            </p>
                        </div>
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card metric-card">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="metric-label">Total Customers</p>
                            <p className="metric-value">{formatNumber(summary?.totals.customers || 0)}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                {formatNumber(summary?.thisMonth.newCustomers || 0)} new this month
                            </p>
                        </div>
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card metric-card">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="metric-label">Products</p>
                            <p className="metric-value">{formatNumber(summary?.totals.products || 0)}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                Active in catalog
                            </p>
                        </div>
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-2" style={{ marginBottom: '32px' }}>
                {/* Revenue Trend */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Revenue Trend</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b6b80"
                                    fontSize={12}
                                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                />
                                <YAxis
                                    stroke="#6b6b80"
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                    labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#6366f1"
                                    fill="url(#revenueGradient)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Trend */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Orders Trend</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b6b80"
                                    fontSize={12}
                                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                />
                                <YAxis stroke="#6b6b80" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => [value, 'Orders']}
                                    labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                                />
                                <Bar
                                    dataKey="orders"
                                    fill="#8b5cf6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-2">
                {/* Top Customers */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Top Customers</h3>
                            <p className="card-subtitle">By total spend</p>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Total Spent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCustomers.map((customer, index) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: `hsl(${index * 60}, 70%, 50%)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    fontWeight: '600'
                                                }}>
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>{customer.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                        {customer.email || 'No email'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{customer.ordersCount}</td>
                                        <td style={{ fontWeight: '600', color: 'var(--color-success)' }}>
                                            {formatCurrency(customer.totalSpent)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Recent Orders</h3>
                            <p className="card-subtitle">Latest transactions</p>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{order.name || `#${order.orderNumber}`}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                {format(new Date(order.orderDate), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>{order.customerName}</td>
                                        <td>
                                            <span className={`badge ${order.financialStatus === 'paid' ? 'badge-success' :
                                                    order.financialStatus === 'pending' ? 'badge-warning' : 'badge-error'
                                                }`}>
                                                {order.financialStatus}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '600' }}>{formatCurrency(order.totalPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
