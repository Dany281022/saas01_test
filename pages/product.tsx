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
  const [patientName, setPatientName] = useState<string>('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<string>('');

  // ----- Streaming state -----
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fonction pour forcer le formatage des listes si l'IA envoie tout en un bloc
  const formatOutput = (text: string) => {
    // Ajoute un saut de ligne avant chaque puce si ce n'est pas déjà le cas
    return text.replace(/\*/g, '\n*');
  };

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
          // On accumule le texte brut
          setOutput((prev) => prev + ev.data);
        },

        onclose() {
          setLoading(false);
        },

        onerror(err) {
          console.error('SSE error:', err);
          setErrorMsg('Streaming error. Verify your OpenAI API Key.');
          setLoading(false);
          throw err;
        },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unexpected error.');
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consultation Notes</label>
          <textarea
            required
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type clinical notes here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md active:scale-95"
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
          <div className="prose prose-blue dark:prose-invert max-w-none">
            {/* Le style whiteSpace: 'pre-wrap' est injecté directement pour forcer les sauts de ligne */}
            <div style={{ whiteSpace: 'pre-wrap' }} className="text-gray-800 dark:text-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {formatOutput(output)}
              </ReactMarkdown>
            </div>
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
