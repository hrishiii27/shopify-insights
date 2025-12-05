'use client';

import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="auth-page" style={{ flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '700',
                    background: 'var(--color-accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px'
                }}>
                    Shopify Insights
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                    Multi-tenant analytics platform for enterprise retailers. Connect your Shopify store and unlock powerful business insights.
                </p>

                <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                    <Link href="/login" className="btn btn-primary btn-lg">
                        Sign In
                    </Link>
                    <Link href="/register" className="btn btn-secondary btn-lg">
                        Get Started
                    </Link>
                </div>
            </div>

            <div className="grid grid-3" style={{ maxWidth: '900px', width: '100%' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ marginBottom: '8px' }}>Real-time Analytics</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        Track orders, revenue, and customer metrics in real-time
                    </p>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔄</div>
                    <h3 style={{ marginBottom: '8px' }}>Auto Sync</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        Automatic data synchronization with webhooks & schedulers
                    </p>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🏢</div>
                    <h3 style={{ marginBottom: '8px' }}>Multi-Tenant</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        Isolated data for each store with secure authentication
                    </p>
                </div>
            </div>
        </div>
    );
}
