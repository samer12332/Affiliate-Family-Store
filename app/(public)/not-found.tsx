import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, ShoppingCart } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-8">
          <AlertCircle className="w-20 h-20 text-primary mx-auto opacity-70 mb-4" />
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-lg">
            Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <ShoppingCart className="w-4 h-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          If you think this is a mistake, please{' '}
          <Link href="/contact" className="text-primary hover:underline font-semibold">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
