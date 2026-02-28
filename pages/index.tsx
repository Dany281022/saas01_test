"use client";

import Head from "next/head";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Head>
        <title>Healthcare Consultation Assistant</title>
        <meta
          name="description"
          content="AI-powered assistant that generates professional summaries, action items, and patient communications from your consultation notes."
        />
      </Head>

      <div className="container mx-auto px-4 py-12">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            MediNotes Pro
          </h1>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/product"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Go to App
              </Link>
              <UserButton showName={true} />
            </SignedIn>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center py-16">
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            Transform Your
            <br className="hidden md:block" />
            Consultation Notes
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            AI-powered assistant that generates professional summaries, action items,
            and patient communications from your consultation notes
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {/* Card 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <div className="text-3xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Professional Summaries
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Generate comprehensive medical record summaries from your notes
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <div className="text-3xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Action Items
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Clear next steps and follow-up actions for every consultation
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <div className="text-3xl mb-4">📧</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Patient Emails
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Draft clear, patient-friendly email communications automatically
                </p>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href="/product"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105"
          >
            Open Consultation Assistant
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>HIPAA Compliant • Secure • Professional</p>
        </div>
      </div>
    </main>
  );
}
