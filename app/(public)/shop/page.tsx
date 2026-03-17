import Link from 'next/link';

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,#fffef8,#f3eee1)] p-10 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Workflow updated</p>
        <h1 className="mt-4 text-4xl font-bold text-stone-900">This is no longer a generic marketplace</h1>
        <p className="mx-auto mt-4 max-w-2xl text-stone-600">
          Orders now begin from merchant-specific pages. Marketers choose a merchant, sell that merchant&apos;s products,
          enter their selling prices, and submit orders directly to the merchant dashboard.
        </p>
        <div className="mt-8">
          <Link
            href="/merchant-directory"
            className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Browse merchant pages
          </Link>
        </div>
      </div>
    </div>
  );
}
