import { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
    category: 'Shipping',
    items: [
      {
        q: 'How long does shipping take?',
        a: 'Shipping typically takes 3-7 business days depending on your governorate. We deliver to all governorates across Egypt.',
      },
      {
        q: 'What are the shipping costs?',
        a: 'Shipping costs vary by governorate. You can see the exact cost during checkout before completing your order.',
      },
      {
        q: 'Do you offer free shipping?',
        a: 'Free shipping is available for orders over 500 EGP to selected governorates. Check your cart for details.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We offer 14-day returns on most items. Products must be unworn and in original packaging.',
      },
      {
        q: 'How do I initiate a return?',
        a: "Contact our support team with your order number and reason for return. We'll provide a return label.",
      },
      {
        q: 'When will I get my refund?',
        a: 'Refunds are processed within 7-10 business days after we receive and inspect your returned item.',
      },
    ],
  },
  {
    category: 'Orders',
    items: [
      {
        q: 'Can I change or cancel my order?',
        a: 'You can cancel orders within 2 hours of placing them. Contact support immediately with your order number.',
      },
      {
        q: 'How can I track my order?',
        a: "You'll receive a tracking link via email once your order ships. You can also check order status in your account.",
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept cash on delivery, credit cards, and debit cards for online payment.',
      },
    ],
  },
  {
    category: 'Products',
    items: [
      {
        q: 'How do I choose the right size?',
        a: 'Each product has a detailed size guide. We recommend checking the measurements before ordering.',
      },
      {
        q: 'Are your products authentic?',
        a: 'Yes, all our products are 100% authentic and sourced directly from trusted suppliers.',
      },
      {
        q: 'Do you offer product exchanges?',
        a: 'Yes, we offer free exchanges for different sizes within 14 days of purchase.',
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
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about our products and services
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
                  {faqSection.category}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqSection.items.map((item, index) => (
                    <AccordionItem key={index} value={`${faqSection.category}-${index}`}>
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-base text-muted-foreground">
                        {item.a}
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
              Didn't find your answer?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our support team is ready to help you. Get in touch with us today.
            </p>
            <a href="/contact" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
