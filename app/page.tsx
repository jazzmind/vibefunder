'use client';

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [email, setEmail] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email signup:', email);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-gray-900 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Your Vibe Dazzles.<br />
              <span className="text-brand">Skip VCs. Go Straight to Profit.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              You've used AI to build software that solves real problems. But it's not production-ready yet. <strong className="text-gray-900 dark:text-white">What if early customers could fund the work to get there?</strong> No dilution. No endless pitching. Just immediate profitability from day one.
            </p>
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                required
              />
              <button type="submit" className="btn whitespace-nowrap">
                Request early access
              </button>
            </form>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              💡 <strong>The power of VibeFunder:</strong> Pinpoint what needs improving → Partner with experts → Rally pre-paying customers → Launch profitably
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">From MVP to Production-Ready in 5 Steps</h2>
              <ol className="space-y-6">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">1</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Pinpoint exactly what needs improving</strong>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">We evaluate your code and create a precise roadmap for security, reliability, scalability, and maintainability.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">2</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Partner with experts at fixed prices</strong>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">We connect you with vetted partners who deliver the work at predictable, guaranteed prices. No budget blowups.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">3</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Rally customers who pre-pay to fund development</strong>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Make it easy for early customers to buy with confidence. Funds held in escrow, released only when milestones are proven complete.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">4</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Delivery guarantee</strong>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Our partners guarantee delivery of the milestones on budget.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">5</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Launch profitably with zero dilution</strong>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Your software is now production-ready, certified, and profitable from day one. You keep 100% of your business.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Included rails</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">SSO/RBAC/audit logging baseline</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">SOC2-track checklist + evidence vault</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Milestone acceptance workflows</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Source code escrow/mirror</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Partner marketplace (security, QA, SRE, legal)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Makers */}
      <section id="makers" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">For Innovators</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                <strong className="text-gray-900 dark:text-white">You:</strong> used AI tools to build a solution and potential customers love the idea... but not the risk. You don't have the funding to meet their requirements.
              </p>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                You could raise... or you could use VibeFunder to get the work done and launch profitably.
                
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">No VCs. No dilution. No endless pitching.</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Transparent milestones & acceptance tests</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Vetted partners; you keep margin</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-brand to-brand-dark dark:from-brand-dark dark:to-brand dark:text-white rounded-2xl p-12 text-center">
              <Image src="/vibefund.png" alt="Rails" width={1000} height={1000} />
              <div className="text-2xl font-bold mt-4">Vibe Code → Enterprise Ready</div>
            </div>
          </div>

        </div>
      </section>

      {/* For Backers */}
      <section id="backers" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-600 text-white rounded-2xl p-12 text-center lg:order-1">
              <div className="text-2xl font-bold">Own your risk profile</div>
            </div>
            <div className="lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">For Smart Early Adopters</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                You've seen the demo. You know this AI tool will transform your business. <strong className="text-gray-900 dark:text-white">Why wait for everyone else to discover it?</strong> Lock in lifetime value, shape the roadmap, and secure your competitive advantage while getting enterprise-grade security and compliance.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Lifetime org license or on‑prem options</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Security & compliance packet (SIG Lite/CAIQ, DPA)</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Escrow tied to proof, not promises</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section id="trust" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-16">Enterprise-Grade Trust & Safety</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Verification</h3>
              <p className="text-gray-600 dark:text-gray-300">Makers screened; identity verified; repositories scanned.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Continuity</h3>
              <p className="text-gray-600 dark:text-gray-300">Escrow/mirror triggers ensure code access for internal continuity.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Evidence</h3>
              <p className="text-gray-600 dark:text-gray-300">Milestone acceptance requires artifacts—pen test summaries, SLO dashboards, restore drills.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-16">FAQ</h2>
          <div className="space-y-6">
            <details className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-600">
              <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">Is this crowdfunding or investing?</summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Neither. It's a commercial pre‑purchase. Backers receive licenses and services, not equity or revenue share.</p>
            </details>
            <details className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-600">
              <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">How does VibeFunder make money?</summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">5% platform fee + margin on optional partner services (security, QA, SRE, legal).</p>
            </details>
            <details className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-600">
              <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">Who owns the IP?</summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Makers own it. Backers get licenses and code‑continuity triggers.</p>
            </details>
            <details className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-600">
              <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">What happens if a milestone fails?</summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">There's a cure window; otherwise escrow refunds release proportionally per terms.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to vibe with your future?</h2>
          <p className="text-xl text-white/90 mb-8">Skip the seed round. Turn your AI breakthrough into profitable, production-ready software with customer funding.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/campaigns" className="bg-white dark:bg-gray-800 text-brand dark:text-brand px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Browse campaigns
            </Link>
            <Link href="/dashboard/new-campaign" className="border border-white dark:border-gray-300 text-white dark:text-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-white dark:hover:bg-gray-300 hover:text-brand dark:hover:text-brand transition-colors">
              Start a campaign
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}