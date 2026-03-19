import { Metadata } from 'next';
import { Heart, Truck, Award, Users } from 'lucide-react';
import { LocalizedText } from '@/components/i18n/LocalizedText';

export const metadata: Metadata = {
  title: 'About Us - FamilyStore',
  description: 'Learn about FamilyStore, our mission to provide quality clothing and accessories for families across Egypt.',
  openGraph: {
    title: 'About Us - FamilyStore',
    description: 'Our story and commitment to quality and customer service',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              <LocalizedText text="About FamilyStore" />
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              <LocalizedText text="Quality clothing and accessories for families, delivered with care and excellence" />
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                <LocalizedText text="Our Story" />
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                FamilyStore was founded with a simple mission: to make quality fashion accessible to families across Egypt. We believe that everyone deserves stylish and comfortable clothing at fair prices.
              </p>
              <p className="text-lg text-muted-foreground">
                Since our launch, we've grown to serve thousands of happy customers, partnering with trusted suppliers to bring you the best selection of clothing, shoes, and accessories for men, women, and children.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-8 h-64 flex items-center justify-center border border-border">
              <p className="text-center text-muted-foreground text-lg font-semibold">
                Your Trusted Partner in Family Fashion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <LocalizedText text="Our Core Values" />
            </h2>
            <p className="text-lg text-muted-foreground">
              <LocalizedText text="What drives everything we do" />
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border text-center">
              <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2"><LocalizedText text="Customer Care" /></h3>
              <p className="text-muted-foreground text-sm">
                Your satisfaction is our priority. We're here to help with any questions.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border text-center">
              <Award className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2"><LocalizedText text="Quality" /></h3>
              <p className="text-muted-foreground text-sm">
                We only offer authentic, high-quality products you can trust.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border text-center">
              <Truck className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2"><LocalizedText text="Fast Delivery" /></h3>
              <p className="text-muted-foreground text-sm">
                Quick shipping across Egypt with reliable tracking and support.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border text-center">
              <Users className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2"><LocalizedText text="Community" /></h3>
              <p className="text-muted-foreground text-sm">
                Building a community of satisfied families across Egypt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12 text-center">
            <LocalizedText text="Why Choose FamilyStore?" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  <LocalizedText text="Wide Selection" />
                </h3>
                <p className="text-muted-foreground">
                  Browse through our extensive collection of clothing, shoes, and accessories for the whole family.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  <LocalizedText text="Fair Prices" />
                </h3>
                <p className="text-muted-foreground">
                  Quality products at prices that won't break the bank. Competitive rates across all categories.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  <LocalizedText text="Easy Returns" />
                </h3>
                <p className="text-muted-foreground">
                  Not happy with your purchase? Return within 14 days for a full refund, no questions asked.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  <LocalizedText text="Expert Support" />
                </h3>
                <p className="text-muted-foreground">
                  Our friendly team is available to help you find the perfect fit and answer any questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-primary/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            <LocalizedText text="Join Our Family" />
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            <LocalizedText text="Start shopping today and experience the FamilyStore difference" />
          </p>
          <a href="/shop" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-lg font-semibold">
            <LocalizedText text="Shop Now" />
          </a>
        </div>
      </section>
    </div>
  );
}
