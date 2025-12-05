'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface SyncLog {
    id: string;
    type: string;
    status: string;
    itemCount: number;
    error: string | null;
    startedAt: string;
    completedAt: string | null;
}

export default function SettingsPage() {
    const { tenant, user } = useAuth();
    const [syncStatus, setSyncStatus] = useState<{
        lastSyncAt: string | null;
        recentLogs: SyncLog[];
    } | null>(null);
    const [accessToken, setAccessToken] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSyncStatus();
    }, []);

    const loadSyncStatus = async () => {
        try {
            const status = await api.getSyncStatus();
            setSyncStatus(status);
        } catch (error) {
            console.error('Failed to load sync status:', error);
        }
    };

    const handleSync = async (type: 'customers' | 'orders' | 'products' | 'all') => {
        setIsSyncing(true);
        setMessage('');
        try {
            const result = await api.triggerSync(type) as { success: boolean; message: string };
            setMessage(result.message || 'Sync started successfully');
            setTimeout(loadSyncStatus, 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sync failed';
            setMessage(`Error: ${errorMessage}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleConnect = async () => {
        if (!accessToken.trim()) return;

        setIsConnecting(true);
        setMessage('');
        try {
            await api.connectShopify(accessToken);
            setMessage('Shopify connected successfully!');
            setAccessToken('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Connection failed');
        } finally {
            setIsConnecting(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString();
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your store connection and data sync</p>
                </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '32px' }}>
                {/* Store Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Store Information</h3>
                    </div>
                    <div className="flex flex-col gap-md">
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Store Name</p>
                            <p style={{ fontWeight: '500' }}>{tenant?.name}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Shopify Domain</p>
                            <p style={{ fontWeight: '500' }}>{tenant?.shopifyDomain}.myshopify.com</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Last Sync</p>
                            <p style={{ fontWeight: '500' }}>
                                {syncStatus?.lastSyncAt ? formatDate(syncStatus.lastSyncAt) : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Account</h3>
                    </div>
                    <div className="flex flex-col gap-md">
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Name</p>
                            <p style={{ fontWeight: '500' }}>{user?.name}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Email</p>
                            <p style={{ fontWeight: '500' }}>{user?.email}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Role</p>
                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shopify Connection */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header">
                    <h3 className="card-title">Shopify Connection</h3>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                    Enter your Shopify Admin API access token to enable data synchronization.
                </p>
                <div className="flex gap-md" style={{ marginBottom: '16px' }}>
                    <input
                        type="password"
                        className="form-input"
                        placeholder="shpat_xxxxxxxxxxxxx"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={handleConnect}
                        className="btn btn-primary"
                        disabled={isConnecting || !accessToken.trim()}
                    >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Get your access token from Shopify Admin &gt; Apps &gt; Develop apps
                </p>
            </div>

            {/* Sync Controls */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header">
                    <h3 className="card-title">Data Synchronization</h3>
                </div>
                {message && (
                    <div style={{
                        padding: '12px',
                        marginBottom: '16px',
                        borderRadius: '8px',
                        background: message.includes('failed') || message.includes('error')
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)',
                        color: message.includes('failed') || message.includes('error')
                            ? 'var(--color-error)'
                            : 'var(--color-success)'
                    }}>
                        {message}
                    </div>
                )}
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <button onClick={() => handleSync('all')} className="btn btn-primary" disabled={isSyncing}>
                        {isSyncing ? 'Syncing...' : 'Sync All Data'}
                    </button>
                    <button onClick={() => handleSync('customers')} className="btn btn-secondary" disabled={isSyncing}>
                        Sync Customers
                    </button>
                    <button onClick={() => handleSync('orders')} className="btn btn-secondary" disabled={isSyncing}>
                        Sync Orders
                    </button>
                    <button onClick={() => handleSync('products')} className="btn btn-secondary" disabled={isSyncing}>
                        Sync Products
                    </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
                    Data is automatically synced every 15 minutes. Use manual sync for immediate updates.
                </p>
            </div>

            {/* Sync Logs */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Sync Logs</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Items</th>
                                <th>Started</th>
                                <th>Completed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syncStatus?.recentLogs.map((log) => (
                                <tr key={log.id}>
                                    <td style={{ textTransform: 'capitalize' }}>{log.type}</td>
                                    <td>
                                        <span className={`badge ${log.status === 'completed' ? 'badge-success' :
                                            log.status === 'running' ? 'badge-warning' :
                                                log.status === 'failed' ? 'badge-error' : 'badge-info'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td>{log.itemCount}</td>
                                    <td style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                        {formatDate(log.startedAt)}
                                    </td>
                                    <td style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                        {log.completedAt ? formatDate(log.completedAt) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {(!syncStatus?.recentLogs || syncStatus.recentLogs.length === 0) && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No sync logs yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
