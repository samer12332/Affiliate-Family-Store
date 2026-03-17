import Link from 'next/link';

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-stone-900">Cart workflow removed</h1>
        <p className="mt-4 text-stone-600">
          This system now runs on merchant-owned order pages instead of a shared marketplace cart. Marketers create
          orders directly inside the merchant they are selling for.
        </p>
        <Link
          href="/merchant-directory"
          className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Open merchant pages
        </Link>
      </div>
    </div>
  );
}
