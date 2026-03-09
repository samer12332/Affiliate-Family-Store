'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { BarChart3, ShoppingCart, Package, MessageSquare, Users, LogOut, Truck } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalMessages: number;
  totalUsers: number;
  recentOrders: any[];
  topProducts: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { token, isLoading, logout } = useAdminAuth();
  const { get } = useApi();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalMessages: 0,
    totalUsers: 0,
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const [ordersRes, productsRes, messagesRes, usersRes] = await Promise.all([
          get('/orders?limit=5').catch(() => ({ orders: [], total: 0 })),
          get('/products?limit=5').catch(() => ({ products: [], total: 0 })),
          get('/messages?limit=5').catch(() => ({ messages: [], total: 0 })),
          get('/admin/users').catch(() => ({ users: [], total: 0 })),
        ]);

        setStats({
          totalOrders: ordersRes.total ?? ordersRes.pagination?.total ?? 0,
          totalProducts: productsRes.total ?? productsRes.pagination?.total ?? 0,
          totalMessages: messagesRes.total ?? messagesRes.pagination?.total ?? 0,
          totalUsers: usersRes.total ?? usersRes.pagination?.total ?? 0,
          recentOrders: ordersRes.orders || [],
          topProducts: productsRes.products || [],
        });
      } catch (error) {
        console.error('[v0] Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, isLoading, router, get]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  if (isLoading || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">FS</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">FamilyStore Admin</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-8">
          <Link href="/admin/products">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Package className="w-4 h-4" />
              Products
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Categories
            </Button>
          </Link>
          <Link href="/admin/orders">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Orders
            </Button>
          </Link>
          <Link href="/admin/messages">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Messages
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Users className="w-4 h-4" />
              Users
            </Button>
          </Link>
          <Link href="/admin/shipping-systems">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Truck className="w-4 h-4" />
              Shipping
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Products</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Messages</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalMessages}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Admin Users</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>
        </div>

        {/* Recent Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : stats.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <Link key={order._id} href={`/admin/orders/${order._id}`}>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer?.email}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        ${Number(order.total ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No orders yet</p>
            )}
          </Card>

          {/* Top Products */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Top Products</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : stats.topProducts.length > 0 ? (
              <div className="space-y-3">
                {stats.topProducts.map((product) => (
                  <Link key={product._id} href={`/admin/products/${product._id}/edit`}>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <p className="font-medium text-foreground line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        ${product.price}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No products yet</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
