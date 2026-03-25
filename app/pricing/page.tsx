import type { Metadata } from 'next'
import Link from 'next/link'
import { AppHeader } from '@/components/layout/AppHeader'
import { PublicPricingToggle } from '@/components/ecd/public-pricing-toggle'

export const metadata: Metadata = {
  title: 'Pricing - CentreConnect',
  description: 'Simple, transparent pricing for ECD centres. Free to start, upgrade when you are ready to grow.',
}

export default function PricingPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-white">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-600">Pricing</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Simple, honest pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Start free. Upgrade when you are ready to run your full operation from one place.
              No contracts. No setup fees for pilot centres.
            </p>
          </div>

          <div className="mt-12">
            <PublicPricingToggle />
          </div>

          {/* FAQ / Trust row */}
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'No contract',
                body: 'Month-to-month. Cancel anytime. We earn your business every month.',
              },
              {
                title: 'WhatsApp support',
                body: 'Real help from a real person. Not a chatbot. We are here when you need us.',
              },
              {
                title: 'Made for SA',
                body: 'Built for South African ECD regulations, DOE reporting, and the realities of running a crèche.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">
              Questions?{' '}
              <a
                href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20have%20a%20question%20about%20CentreConnect%20pricing"
                className="font-semibold text-teal-600 hover:text-teal-700"
                target="_blank"
                rel="noreferrer"
              >
                Chat with us on WhatsApp
              </a>
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
