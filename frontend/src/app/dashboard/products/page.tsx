'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Product {
    id: string;
    title: string;
    vendor: string | null;
    productType: string | null;
    price: number;
    inventory: number;
    imageUrl: string | null;
}

interface ProductTypeData {
    type: string;
    count: number;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productTypes, setProductTypes] = useState<ProductTypeData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [summary, productsData, typesData] = await Promise.all([
                api.getSummary(),
                api.getProducts(20),
                api.getRevenueByProductType(),
            ]);

            setTotalProducts(summary.totals.products);
            setProducts(productsData);
            setProductTypes(typesData);
        } catch (error) {
            console.error('Failed to load products data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const totalInventory = products.reduce((sum, p) => sum + p.inventory, 0);
    const avgPrice = products.length > 0
        ? products.reduce((sum, p) => sum + p.price, 0) / products.length
        : 0;

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
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">Manage and analyze your product catalog</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                <div className="card metric-card">
                    <p className="metric-label">Total Products</p>
                    <p className="metric-value">{totalProducts}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Categories</p>
                    <p className="metric-value">{productTypes.length}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Total Inventory</p>
                    <p className="metric-value">{totalInventory}</p>
                </div>
                <div className="card metric-card">
                    <p className="metric-label">Avg Price</p>
                    <p className="metric-value">{formatCurrency(avgPrice)}</p>
                </div>
            </div>

            <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                {/* Product Types */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">By Category</h3>
                    </div>
                    <div className="flex flex-col gap-md">
                        {productTypes.map((type, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span style={{ color: 'var(--color-text-secondary)' }}>{type.type}</span>
                                <span className="badge badge-info">{type.count} products</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock Warning */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <h3 className="card-title">Inventory Status</h3>
                    </div>
                    <div className="flex flex-col gap-md">
                        {products.filter(p => p.inventory < 20).slice(0, 5).map((product) => (
                            <div key={product.id} className="flex items-center justify-between" style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: '500' }}>{product.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{product.vendor}</div>
                                </div>
                                <span className="badge badge-warning">{product.inventory} in stock</span>
                            </div>
                        ))}
                        {products.filter(p => p.inventory < 20).length === 0 && (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>All products are well stocked!</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">All Products</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Type</th>
                                <th>Vendor</th>
                                <th>Price</th>
                                <th>Inventory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="flex items-center gap-md">
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: 'var(--color-bg-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span style={{ fontWeight: '500' }}>{product.title}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{product.productType || 'Uncategorized'}</span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>{product.vendor || 'N/A'}</td>
                                    <td style={{ fontWeight: '600' }}>{formatCurrency(product.price)}</td>
                                    <td>
                                        <span className={`badge ${product.inventory < 10 ? 'badge-error' : product.inventory < 30 ? 'badge-warning' : 'badge-success'}`}>
                                            {product.inventory}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
