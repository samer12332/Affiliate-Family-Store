'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  total: number;
  status: string;
  shippingAddress?: {
    governorate?: string;
  };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  'Pending Review': 'bg-yellow-100 text-yellow-800',
  'Confirmed with Customer': 'bg-blue-100 text-blue-800',
  'Sent to Supplier': 'bg-purple-100 text-purple-800',
  'Supplier Confirmed': 'bg-indigo-100 text-indigo-800',
  'Out for Delivery': 'bg-orange-100 text-orange-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export default function AdminOrders() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 10;
  const formatMoney = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(2)} EGP` : '0.00 EGP';
  };

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(status && { status }),
        });
        const data = await get(`/orders?${query}`);
        setOrders(data.orders || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      } catch (error) {
        console.error('[v0] Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, isLoading, router, currentPage, status, get]);

  if (isLoading || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                ← Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">Orders</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              >
                <option value="">All Orders</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Confirmed with Customer">Confirmed with Customer</option>
                <option value="Sent to Supplier">Sent to Supplier</option>
                <option value="Supplier Confirmed">Supplier Confirmed</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Order #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Governorate
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Total
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Date
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-foreground">{order.customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customer.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {order.shippingAddress?.governorate || '-'}
                        </td>
                        <td className="py-3 px-4 text-foreground font-medium">
                          {formatMoney(order.total)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              statusColors[order.status] ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/admin/orders/${order._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
