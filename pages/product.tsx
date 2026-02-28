"use client";

import React, { useState } from 'react';
import { useAuth, Protect, UserButton, PricingTable } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

function ConsultationForm() {
  const { getToken } = useAuth();
  const [patientName, setPatientName] = useState('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  // RÉPARATION VISUELLE : Gère le gras et les sauts de ligne
  const formatOutput = (text: string) => {
    return text
      // Force le gras sur les labels pour qu'ils ressortent comme sur l'image
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n**$1**')
      // S'assure que les listes "Next steps" commencent bien à la ligne
      .replace(/(\d\.)/g, '\n$1')
      // Isole "Take care," et la signature
      .replace(/(Take care,|Dear)/g, '\n\n$1')
      .replace(/(\[Doctor's Name\])/g, '\n$1')
      .trim();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOutput('');
    setLoading(true);
    try {
      const jwt = await getToken();
      await fetchEventSource('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: visitDate?.toISOString().slice(0, 10),
          notes: notes,
        }),
        onmessage(ev) {
          if (ev.data === "[DONE]") { setLoading(false); return; }
          setOutput((prev) => prev + ev.data);
        },
      });
    } catch (err) { setLoading(false); }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Consultation Notes</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Patient Name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <DatePicker selected={visitDate} onChange={(d) => setVisitDate(d)} className="p-2 border rounded-lg w-full" />
        </div>
        <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter clinical notes..." />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
          {loading ? 'Processing...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white p-10 rounded-xl shadow-2xl border border-blue-50">
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Titres en BLEU et GRAS avec bordure
                h3: ({...props}) => <h3 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-50 pb-2 mb-6 mt-8" {...props} />,
                // Paragraphes aérés
                p: ({...props}) => <p className="text-gray-700 leading-relaxed mb-3" {...props} />,
                // Liste pour les Next Steps
                li: ({...props}) => <li className="ml-4 mb-2 list-decimal text-gray-700" {...props} />,
                // Labels en gras (Patient Name, etc.)
                strong: ({...props}) => <strong className="text-gray-900 font-semibold inline-block mt-1" {...props} />,
              }}
            >
              {formatOutput(output)}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Product() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      <div className="absolute top-4 right-4"><UserButton /></div>
      <Protect fallback={<div className="p-20 text-center"><PricingTable /></div>}><ConsultationForm /></Protect>
    </main>
  );
}
