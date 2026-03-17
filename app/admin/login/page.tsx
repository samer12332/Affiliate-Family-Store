'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('sameryousry99@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const role = result.admin?.role;
        router.push(role === 'marketer' ? '/merchant-directory' : '/admin/dashboard');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#f5efe1,transparent_45%),linear-gradient(135deg,#fffef8,#f4efe4)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-2xl shadow-stone-200/60">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Affiliate Family Store</p>
          <h1 className="mt-3 text-3xl font-bold text-stone-900">Role-Based Control Center</h1>
          <p className="mt-2 text-sm text-stone-600">
            Sign in as owner, super admin, merchant, or marketer.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Password</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? 'Signing in...' : 'Enter dashboard'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Protected owner account: sameryousry99@gmail.com
        </p>
      </div>
    </div>
  );
}
