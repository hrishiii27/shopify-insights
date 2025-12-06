'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';

interface RFMSegment {
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
}

interface ForecastData {
    historical: Array<{ date: string; revenue: number; orders: number }>;
    forecast: Array<{ date: string; predictedRevenue: number; confidence: number }>;
    trend: string;
    weeklyGrowth: number;
    avgDailyRevenue: number;
    predictedWeeklyRevenue: number;
}

const SEGMENT_COLORS: Record<string, string> = {
    'Champions': '#10b981',
    'Loyal Customers': '#6366f1',
    'Potential Loyalists': '#8b5cf6',
    'Recent Customers': '#3b82f6',
    'Promising': '#f59e0b',
    'Need Attention': '#f97316',
    'At Risk': '#ef4444',
    'Hibernating': '#6b7280',
};

const SEGMENT_DESCRIPTIONS: Record<string, string> = {
    'Champions': 'Best customers, buy often, spend the most',
    'Loyal Customers': 'Regular buyers with high lifetime value',
    'Potential Loyalists': 'Recent customers with good frequency',
    'Recent Customers': 'Just made their first purchase',
    'Promising': 'Decent spend, but not very recent',
    'Need Attention': 'Good customers at risk of churning',
    'At Risk': 'Used to be active, now declining',
    'Hibernating': 'Inactive customers, may need win-back',
};

export default function AnalyticsPage() {
    const [segments, setSegments] = useState<RFMSegment[]>([]);
    const [forecastData, setForecastData] = useState<ForecastData | null>(null);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSegment, setSelectedSegment] = useState<RFMSegment | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [rfmData, forecast] = await Promise.all([
                api.getRFMSegments(),
                api.getRevenueForecast(),
            ]);

            setSegments(rfmData?.segments || []);
            setTotalCustomers(rfmData?.totalCustomers || 0);
            setForecastData(forecast || null);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            setSegments([]);
            setTotalCustomers(0);
            setForecastData(null);
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

    // Combine historical and forecast data for chart
    const chartData = forecastData ? [
        ...forecastData.historical.map(d => ({ ...d, type: 'historical' })),
        ...forecastData.forecast.map(d => ({
            date: d.date,
            revenue: null,
            predictedRevenue: d.predictedRevenue,
            confidence: d.confidence,
            type: 'forecast'
        })),
    ] : [];

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
                    <h1 className="page-title">Advanced Analytics</h1>
                    <p className="page-subtitle">AI-powered insights for smarter decisions</p>
                </div>
            </div>

            {/* ===== FEATURE 1: Revenue Forecasting ===== */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">📈 Revenue Forecast</h3>
                        <p className="card-subtitle">7-day prediction based on historical trends</p>
                    </div>
                    {forecastData && (
                        <div className="flex gap-lg">
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Trend</p>
                                <span className={`badge ${forecastData.trend === 'growing' ? 'badge-success' :
                                    forecastData.trend === 'declining' ? 'badge-error' : 'badge-info'
                                    }`} style={{ textTransform: 'capitalize' }}>
                                    {forecastData.trend === 'growing' ? '📈' : forecastData.trend === 'declining' ? '📉' : '➡️'} {forecastData.trend}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Weekly Growth</p>
                                <p style={{
                                    fontWeight: '600',
                                    color: (forecastData.weeklyGrowth ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                                }}>
                                    {(forecastData.weeklyGrowth ?? 0) >= 0 ? '+' : ''}{(forecastData.weeklyGrowth ?? 0).toFixed(1)}%
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Predicted Weekly</p>
                                <p style={{ fontWeight: '600', color: 'var(--color-accent-primary)' }}>
                                    {formatCurrency(forecastData.predictedWeeklyRevenue)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="#6b6b80"
                                fontSize={12}
                                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                            />
                            <YAxis stroke="#6b6b80" fontSize={12} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a2e',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                                labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                                formatter={(value: number, name: string) => [
                                    formatCurrency(value),
                                    name === 'revenue' ? 'Actual' : 'Predicted'
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#6366f1"
                                fill="url(#historicalGradient)"
                                strokeWidth={2}
                                name="revenue"
                            />
                            <Line
                                type="monotone"
                                dataKey="predictedRevenue"
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: '#10b981', r: 4 }}
                                name="predictedRevenue"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '16px',
                    padding: '16px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '3px', background: '#6366f1' }}></div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Historical Revenue</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '3px', background: '#10b981', borderStyle: 'dashed' }}></div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Forecasted Revenue</span>
                    </div>
                </div>
            </div>

            {/* ===== FEATURE 2: RFM Customer Segmentation ===== */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <h3 className="card-title">🎯 Customer Segmentation (RFM)</h3>
                        <p className="card-subtitle">
                            Customers grouped by Recency, Frequency & Monetary value • {totalCustomers} total
                        </p>
                    </div>
                </div>

                <div className="grid grid-2" style={{ gap: '24px' }}>
                    {/* Segment Distribution */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Segment Distribution</h4>
                        {segments.length === 0 ? (
                            <div style={{
                                padding: '48px',
                                textAlign: 'center',
                                color: 'var(--color-text-muted)',
                                border: '2px dashed var(--border-color)',
                                borderRadius: '12px'
                            }}>
                                <p style={{ fontSize: '24px', marginBottom: '8px' }}>📊</p>
                                <p>No customer data yet</p>
                                <p style={{ fontSize: '12px', marginTop: '8px' }}>Sync your Shopify data to see RFM segments</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-sm">
                                {segments.map((segment) => (
                                    <div
                                        key={segment.segment}
                                        onClick={() => setSelectedSegment(selectedSegment?.segment === segment.segment ? null : segment)}
                                        style={{
                                            padding: '12px 16px',
                                            background: selectedSegment?.segment === segment.segment
                                                ? 'rgba(99, 102, 241, 0.15)'
                                                : 'rgba(255, 255, 255, 0.02)',
                                            border: `1px solid ${selectedSegment?.segment === segment.segment ? 'var(--color-accent-primary)' : 'var(--border-color)'}`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-md">
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: SEGMENT_COLORS[segment.segment] || '#6b7280'
                                                }}></div>
                                                <div>
                                                    <p style={{ fontWeight: '500' }}>{segment.segment}</p>
                                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                        {SEGMENT_DESCRIPTIONS[segment.segment]}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontWeight: '600' }}>{segment.count}</p>
                                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                    {totalCustomers > 0 ? ((segment.count / totalCustomers) * 100).toFixed(1) : 0}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{
                                            marginTop: '12px',
                                            height: '6px',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${totalCustomers > 0 ? Math.min((segment.count / totalCustomers) * 100 * 2, 100) : 0}%`,
                                                height: '100%',
                                                background: SEGMENT_COLORS[segment.segment] || '#6b7280',
                                                transition: 'width 0.5s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Segment Details */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                            {selectedSegment ? `${selectedSegment.segment} Details` : 'Select a Segment'}
                        </h4>

                        {selectedSegment ? (
                            <div className="fade-in">
                                <div className="grid grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Total Value</p>
                                        <p style={{ fontSize: '24px', fontWeight: '700', color: SEGMENT_COLORS[selectedSegment.segment] }}>
                                            {formatCurrency(selectedSegment.totalValue)}
                                        </p>
                                    </div>
                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Avg per Customer</p>
                                        <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                                            {formatCurrency(selectedSegment.avgValue)}
                                        </p>
                                    </div>
                                </div>

                                <h5 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-secondary)' }}>
                                    Top Customers in Segment
                                </h5>
                                <div className="flex flex-col gap-sm">
                                    {selectedSegment.topCustomers.map((customer, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <div>
                                                <p style={{ fontWeight: '500' }}>{customer.name}</p>
                                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                    {customer.ordersCount} orders • Last seen {customer.daysSinceLastOrder}d ago
                                                </p>
                                            </div>
                                            <p style={{ fontWeight: '600', color: 'var(--color-success)' }}>
                                                {formatCurrency(customer.totalSpent)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                padding: '48px',
                                textAlign: 'center',
                                color: 'var(--color-text-muted)',
                                border: '2px dashed var(--border-color)',
                                borderRadius: '12px'
                            }}>
                                <p style={{ fontSize: '24px', marginBottom: '8px' }}>👈</p>
                                <p>Click on a segment to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
