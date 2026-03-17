import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-stone-900">Checkout moved into merchant order pages</h1>
        <p className="mt-4 text-stone-600">
          The old marketplace checkout flow has been retired. Marketers now create orders from a specific merchant page,
          where shipping is calculated automatically by governorate and the merchant receives the order instantly.
        </p>
        <Link
          href="/merchant-directory"
          className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Go to merchant pages
        </Link>
      </div>
    </div>
  );
}
