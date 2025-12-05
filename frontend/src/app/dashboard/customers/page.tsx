'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

interface TopCustomer {
    id: string;
    email: string | null;
    name: string;
    totalSpent: number;
    ordersCount: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'];

export default function CustomersPage() {
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCustomers, setTotalCustomers] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [summary, customers] = await Promise.all([
                api.getSummary(),
                api.getTopCustomers(10),
            ]);

            setTotalCustomers(summary.totals.customers);
            setTopCustomers(customers);
        } catch (error) {
            console.error('Failed to load customers data:', error);
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

    const pieData = topCustomers.slice(0, 5).map((c) => ({
        name: c.name,
        value: c.totalSpent,
    }));

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
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Analyze your customer base and spending patterns</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                <div className="card metric-card">
                    <p className="metric-label">Total Customers</p>
                    <p className="metric-value">{totalCustomers}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Top Spender</p>
                    <p className="metric-value">
                        {topCustomers[0] ? formatCurrency(topCustomers[0].totalSpent) : '$0'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {topCustomers[0]?.name || 'N/A'}
                    </p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Avg Orders/Customer</p>
                    <p className="metric-value">
                        {topCustomers.length > 0
                            ? (topCustomers.reduce((sum, c) => sum + c.ordersCount, 0) / topCustomers.length).toFixed(1)
                            : '0'}
                    </p>
                </div>
            </div>

            <div className="grid grid-2">
                {/* Pie Chart */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Top 5 by Spend</h3>
                            <p className="card-subtitle">Revenue distribution</p>
                        </div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-sm" style={{ marginTop: '16px' }}>
                        {pieData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-sm">
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        background: COLORS[index]
                                    }} />
                                    <span style={{ fontSize: '14px' }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatCurrency(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Customer Table */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Top Customers</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Total Spent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCustomers.map((customer, index) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: index < 3 ? 'var(--color-accent-gradient)' : 'var(--color-bg-tertiary)',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: '500' }}>{customer.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                    {customer.email || 'No email'}
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
            </div>
        </div>
    );
}
