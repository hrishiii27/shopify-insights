'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';

interface OrderData {
    date: string;
    orders: number;
    revenue: number;
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

export default function OrdersPage() {
    const [ordersByDate, setOrdersByDate] = useState<OrderData[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, recentData] = await Promise.all([
                api.getOrdersByDate(dateRange.start, dateRange.end),
                api.getRecentOrders(20),
            ]);

            setOrdersByDate(ordersData);
            setRecentOrders(recentData);
        } catch (error) {
            console.error('Failed to load orders data:', error);
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

    const totalOrders = ordersByDate.reduce((sum, d) => sum + d.orders, 0);
    const totalRevenue = ordersByDate.reduce((sum, d) => sum + d.revenue, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Track and analyze your order history</p>
                </div>
                <div className="date-picker">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                <div className="card metric-card">
                    <p className="metric-label">Period Orders</p>
                    <p className="metric-value">{totalOrders}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Period Revenue</p>
                    <p className="metric-value">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Avg Order Value</p>
                    <p className="metric-value">{formatCurrency(avgOrderValue)}</p>
                </div>
            </div>

            {/* Orders Chart */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Orders by Date</h3>
                        <p className="card-subtitle">Daily order count and revenue</p>
                    </div>
                </div>
                <div className="chart-container" style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByDate}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="#6b6b80"
                                fontSize={12}
                                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                            />
                            <YAxis yAxisId="left" stroke="#6b6b80" fontSize={12} />
                            <YAxis yAxisId="right" orientation="right" stroke="#6b6b80" fontSize={12} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a2e',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                                labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                            />
                            <Bar yAxisId="left" dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} name="Orders" />
                            <Bar yAxisId="right" dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">All Orders</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Payment</th>
                                <th>Fulfillment</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order.id}>
                                    <td style={{ fontWeight: '500' }}>{order.name || `#${order.orderNumber}`}</td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {format(new Date(order.orderDate), 'MMM d, yyyy h:mm a')}
                                    </td>
                                    <td>{order.customerName}</td>
                                    <td>
                                        <span className={`badge ${order.financialStatus === 'paid' ? 'badge-success' :
                                                order.financialStatus === 'pending' ? 'badge-warning' : 'badge-error'
                                            }`}>
                                            {order.financialStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${order.fulfillmentStatus === 'fulfilled' ? 'badge-success' :
                                                order.fulfillmentStatus === 'partial' ? 'badge-warning' : 'badge-info'
                                            }`}>
                                            {order.fulfillmentStatus || 'unfulfilled'}
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
    );
}
