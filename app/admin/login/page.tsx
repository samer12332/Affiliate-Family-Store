'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { validateEmail } from '@/lib/common-validation';
import { AlertCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';

export default function AdminLogin() {
  const router = useRouter();
  const { t } = useI18n();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validateEmail(email)) {
      setError(t('Please provide a valid email address'));
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError(t('Password must be between 6 and 128 characters'));
      return;
    }
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const role = result.admin?.role;
        router.push(role === 'marketer' ? '/merchant-directory' : '/admin/dashboard');
      } else {
        setError(result.error || t('Invalid email or password'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#f5efe1,transparent_45%),linear-gradient(135deg,#fffef8,#f4efe4)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-2xl shadow-stone-200/60">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{t('Affiliate Family Store')}</p>
          <h1 className="mt-3 text-3xl font-bold text-stone-900">{t('Role-Based Control Center')}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {t('Sign in as owner, admin, main merchant, submerchant, or marketer.')}
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
            <label className="mb-2 block text-sm font-medium text-stone-800">{t('Email')}</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required maxLength={254} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-800">{t('Password')}</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} maxLength={128} />
          </div>

          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? t('Signing in...') : t('Enter dashboard')}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          {t('Protected owner account: sameryousry99@gmail.com')}
        </p>
      </div>
    </div>
  );
}
