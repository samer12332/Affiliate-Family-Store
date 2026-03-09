'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface Message {
  _id: string;
  type: 'contact' | 'productInquiry';
  name: string;
  email: string;
  phone: string;
  message: string;
  productId?: string;
  createdAt: string;
}

export default function AdminMessages() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, delete: deleteRequest } = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(type && { type }),
        });
        const data = await get(`/messages?${query}`);
        setMessages(data.messages || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      } catch (error) {
        console.error('[v0] Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [token, isLoading, router, currentPage, type, get]);

  const handleDelete = async (messageId: string) => {
    try {
      await deleteRequest(`/messages/${messageId}`);
      setMessages(messages.filter((m) => m._id !== messageId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('[v0] Failed to delete message:', error);
    }
  };

  if (isLoading || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              ← Dashboard
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Messages & Inquiries</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              >
                <option value="">All Messages</option>
                <option value="contact">Contact</option>
                <option value="productInquiry">Product Inquiry</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Messages Table */}
        <Card className="p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading messages...</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        From
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Message
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Date
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => (
                      <tr
                        key={message._id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {message.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {message.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              message.type === 'contact'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {message.type === 'contact'
                              ? 'Contact'
                              : 'Product Inquiry'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground max-w-xs truncate">
                          {message.message}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMessage(message)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(message._id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Message Details
            </h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  From
                </p>
                <p className="text-foreground font-medium">{selectedMessage.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="text-primary hover:underline"
                >
                  {selectedMessage.email}
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Phone
                </p>
                <a
                  href={`tel:${selectedMessage.phone}`}
                  className="text-primary hover:underline"
                >
                  {selectedMessage.phone}
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Type
                </p>
                <p className="text-foreground">
                  {selectedMessage.type === 'contact'
                    ? 'Contact Request'
                    : 'Product Inquiry'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Message
                </p>
                <p className="text-foreground whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedMessage(null)}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Delete Message?
            </h2>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
