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
  const [patientName, setPatientName] = useState<string>('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CETTE FONCTION EST LA CLÉ : Elle nettoie les "*" et crée les titres
  const formatOutput = (text: string) => {
    return text
      // 1. Supprime les astérisques seuls sur une ligne
      .replace(/^\s*\*\s*$/gm, '')
      // 2. Transforme les titres principaux en Headers Markdown (###)
      .replace(/\*?(Summary of visit for the doctor's records)\*?/g, '\n### $1\n')
      .replace(/\*?(Next steps for the doctor)\*?/g, '\n### $1\n')
      .replace(/\*?(Draft of email to patient in patient-friendly language)\*?/g, '\n### $1\n')
      // 3. Assure que "Patient Name:", "Date of Visit:", etc. sont sur de nouvelles lignes
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n**$1**')
      // 4. Nettoie les doubles astérisques restants
      .replace(/\*\*/g, '') 
      .trim();
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

      await fetchEventSource('/api', {
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
        onmessage(ev) {
          if (ev.data === "[DONE]") {
            setLoading(false);
            return;
          }
          setOutput((prev) => prev + ev.data);
        },
        onclose() { setLoading(false); },
        onerror(err) {
          setErrorMsg('Streaming error. Verify API Key.');
          setLoading(false);
          throw err;
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
        Consultation Notes
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Patient Name</label>
          <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Visit</label>
          <DatePicker selected={visitDate} onChange={(d: Date | null) => setVisitDate(d)} dateFormat="yyyy-MM-dd" required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consultation Notes</label>
          <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type clinical notes here..." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all active:scale-95">
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-10 border border-gray-200 dark:border-gray-700">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  h3: ({node, ...props}) => <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-10 mb-4 border-b-2 border-blue-100 pb-2" {...props} />,
                  p: ({node, ...props}) => <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4 text-lg" {...props} />,
                  li: ({node, ...props}) => <li className="ml-6 mb-3 text-gray-700 dark:text-gray-300 list-disc marker:text-blue-500" {...props} />,
                }}
              >
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
      <div className="absolute top-4 right-4"><UserButton showName={true} /></div>
      <Protect fallback={<div className="container mx-auto px-4 py-20 text-center"><h1 className="text-4xl font-bold mb-6 text-gray-800">Access Restricted</h1><PricingTable /></div>}>
        <ConsultationForm />
      </Protect>
    </main>
  );
}
