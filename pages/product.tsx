"use client";

import React, { useState } from 'react';
import { useAuth, Protect, UserButton, PricingTable } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchEventSource } from '@microsoft/fetch-event-source';

function ConsultationForm() {
  const { getToken } = useAuth();

  // ----- Form state -----
  const [patientName, setPatientName] = useState('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');

  // ----- Streaming state -----
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOutput('');
    setErrorMsg(null);
    setLoading(true);

    try {
      const jwt = await getToken();
      if (!jwt) {
        setErrorMsg('Authentication required');
        setLoading(false);
        return;
      }

      const controller = new AbortController();

      await fetchEventSource('/api', {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: visitDate?.toISOString().slice(0, 10),
          notes: notes,
        }),

        onopen: async (resp) => {
          if (resp.ok && resp.headers.get('content-type')?.includes('text/event-stream')) {
            return; 
          } else if (resp.status === 422) {
             throw new Error("Validation Error: Check if all fields are filled correctly.");
          } else {
            throw new Error(`Server error: ${resp.status}`);
          }
        },

        onmessage(ev) {
          if (ev.data === "[DONE]") {
            setLoading(false);
            return;
          }
          // On ajoute le nouveau contenu au fur et à mesure
          setOutput((prev) => prev + ev.data);
        },

        onclose() {
          setLoading(false);
        },

        onerror(err) {
          console.error('SSE error:', err);
          setErrorMsg('Streaming error. Verify your OpenAI API Key in Vercel settings.');
          setLoading(false);
          throw err;
        },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unexpected error. Check console.');
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Consultation Notes
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Patient Name</label>
          <input
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Enter patient's full name"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Visit</label>
          <DatePicker
            selected={visitDate}
            onChange={(d: Date | null) => setVisitDate(d)}
            dateFormat="yyyy-MM-dd"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consultation Notes</label>
          <textarea
            required
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Type clinical notes here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-all"
        >
          {loading ? 'Generating Summary...' : 'Generate AI Summary'}
        </button>
      </form>

      {errorMsg && (
        <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
          {errorMsg}
        </div>
      )}

      {output && (
        <section className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          {/* Correction ici : ajout de whitespace-pre-line */}
          <div className="prose prose-blue dark:prose-invert max-w-none whitespace-pre-line">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {output}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Product() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="absolute top-4 right-4">
        <UserButton showName={true} />
      </div>

      <Protect
        fallback={
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-4xl font-bold mb-6">Upgrade to Premium</h1>
            <p className="text-gray-600 mb-12">You need a healthcare professional plan to access this tool.</p>
            <div className="max-w-4xl mx-auto">
              <PricingTable />
            </div>
          </div>
        }
      >
        <ConsultationForm />
      </Protect>
    </main>
  );
}
