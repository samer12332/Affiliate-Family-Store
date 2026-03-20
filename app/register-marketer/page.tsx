'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/useApi';
import { validateEmail } from '@/lib/common-validation';

export default function RegisterMarketerPage() {
  const router = useRouter();
  const { post } = useApi();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError('Password must be between 6 and 128 characters');
      return;
    }

    try {
      setLoading(true);
      await post('/auth/register-marketer', {
        name,
        email,
        password,
        phone,
      });
      setSuccess('Marketer account created successfully. You can now sign in.');
      setTimeout(() => {
        router.push('/admin/login');
      }, 1200);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Failed to register marketer account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#f5efe1,transparent_45%),linear-gradient(135deg,#fffef8,#f4efe4)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-2xl shadow-stone-200/60">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Affiliate Family Store</p>
          <h1 className="mt-3 text-3xl font-bold text-stone-900">Marketer registration</h1>
          <p className="mt-2 text-sm text-stone-600">
            Self-signup is available only for marketer accounts.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Full name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Email</label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required maxLength={254} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Password</label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} maxLength={128} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">Phone (optional)</label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Create marketer account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Already have an account?{' '}
          <Link href="/admin/login" className="font-semibold text-stone-700 hover:text-stone-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

