import { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { LocalizedText } from '@/components/i18n/LocalizedText';

export const metadata: Metadata = {
  title: 'FAQ - FamilyStore',
  description: 'Frequently asked questions about FamilyStore, shipping, returns, and more.',
  openGraph: {
    title: 'FAQ - FamilyStore',
    description: 'Find answers to common questions',
    type: 'website',
  },
};

const faqs = [
  {
    category: 'Accounts & Access',
    items: [
      {
        q: 'Who can create an account directly from the website?',
        a: 'Self-signup is available for marketer accounts only. Other roles are created and managed from the admin users panel.',
      },
      {
        q: 'How do I sign in?',
        a: 'Go to the login page and sign in with your assigned role account. After login, you are redirected based on your role permissions.',
      },
      {
        q: 'I am a new merchant and want to join. What should I do?',
        a: 'Use the Contact Us page and send your merchant details. The owner/admin team reviews requests and contacts you.',
      },
    ],
  },
  {
    category: 'Marketplace & Cart',
    items: [
      {
        q: 'Can marketers add products from different merchants into one cart?',
        a: 'No. The cart enforces a single submerchant at a time.',
      },
      {
        q: 'Can marketers add products with different shipping types into one cart?',
        a: 'No. The cart enforces a single shipping type for all items.',
      },
      {
        q: 'How is shipping calculated at checkout?',
        a: 'Shipping is estimated by governorate using the selected merchant shipping system and the items in the cart.',
      },
    ],
  },
  {
    category: 'Orders & Commissions',
    items: [
      {
        q: 'What happens when a marketer confirms checkout?',
        a: 'The system creates an order for the selected submerchant using the customer details, selected products, and shipping estimate.',
      },
      {
        q: 'How do order statuses work?',
        a: 'Orders move through statuses such as pending, confirmed, shipped, delivered, or cancelled, based on role permissions.',
      },
      {
        q: 'Where can I see commission and settlement updates?',
        a: 'Use the commissions and order details pages. Notifications are also sent to relevant users when commission-transfer actions are recorded.',
      },
    ],
  },
  {
    category: 'Notifications & Support',
    items: [
      {
        q: 'Who receives system notifications?',
        a: 'Notifications are created for users involved in order and commission events. Owner/admin users also receive operational alerts such as incoming contact messages.',
      },
      {
        q: 'Where can I view notifications?',
        a: 'Open the Notifications page from the dashboard/header to view, open, and mark notifications as read.',
      },
      {
        q: 'How can I contact support?',
        a: 'Use the Contact Us page. For onboarding requests, include your merchant/business details so the team can follow up quickly.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              <LocalizedText text="Frequently Asked Questions" />
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              <LocalizedText text="Find answers about roles, marketer workflow, orders, commissions, and support" />
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {faqs.map((faqSection) => (
              <div key={faqSection.category}>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
                  <LocalizedText text={faqSection.category} />
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqSection.items.map((item, index) => (
                    <AccordionItem key={index} value={`${faqSection.category}-${index}`}>
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">
                        <LocalizedText text={item.q} />
                      </AccordionTrigger>
                      <AccordionContent className="text-base text-muted-foreground">
                        <LocalizedText text={item.a} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 p-8 bg-muted rounded-lg text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              <LocalizedText text="Didn't find your answer?" />
            </h3>
            <p className="text-muted-foreground mb-6">
              <LocalizedText text="Contact the team and include your details. We will review and get back to you." />
            </p>
            <a href="/contact" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              <LocalizedText text="Contact Us" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
