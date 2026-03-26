import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { ContactForm } from '@/components/forms/ContactForm';
import { LocalizedText } from '@/components/i18n/LocalizedText';

export const metadata: Metadata = {
  title: 'Contact Us - FamilyStore',
  description: 'Get in touch with our customer support team. We are here to help you with any questions or concerns.',
  openGraph: {
    title: 'Contact Us - FamilyStore',
    description: 'Get in touch with our customer support team.',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              <LocalizedText text="Contact Us" />
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              <LocalizedText text="New merchants can contact us here if they want to join FamilyStore. Send us your details and we will respond as soon as possible." />
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                <LocalizedText text="Get in Touch" />
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1"><LocalizedText text="WhatsApp number" /></h3>
                    <a
                      href="https://wa.me/201017306593?text=Hello%20I%20want%20to%20ask%20about%20FamilyStore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      +201017306593
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1"><LocalizedText text="Email" /></h3>
                    <a href="mailto:sameryousry44@gmail.com" className="text-muted-foreground hover:text-primary">
                      sameryousry44@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1"><LocalizedText text="Address" /></h3>
                    <p className="text-muted-foreground">
                      Cairo, Egypt
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1"><LocalizedText text="Working Hours" /></h3>
                    <p className="text-muted-foreground">
                      24/7
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <LocalizedText text="Frequently Asked Questions" />
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              <LocalizedText text="Find answers to common questions" />
            </p>
            <Button asChild>
              <a href="/faq"><LocalizedText text="View All FAQs" /></a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
