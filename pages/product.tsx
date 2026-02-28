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

  // LOGIQUE DE RÉPARATION ULTIME
  const formatOutput = (text: string) => {
    return text
      // Force les titres ### à être sur une nouvelle ligne avec de l'espace
      .replace(/(### Summary|### Next|### Draft)/g, '\n\n$1')
      // Force chaque étiquette de données à aller à la ligne et être en gras
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n\n**$1**')
      // S'assure que les signatures sont bien séparées
      .replace(/(Take care,|Dear)/g, '\n\n$1')
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
      <h1 className="text-4xl font-bold mb-8 text-center">Consultation Notes</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border">
        <input type="text" placeholder="Patient Name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full p-2 border rounded" />
        <DatePicker selected={visitDate} onChange={(d) => setVisitDate(d)} className="w-full p-2 border rounded" />
        <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 border rounded" placeholder="Notes..." />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white p-10 rounded-xl shadow-2xl border">
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h3: ({...props}) => <h3 className="text-2xl font-bold text-blue-600 border-b pb-2 mb-6" {...props} />,
                p: ({...props}) => <p className="text-gray-800 leading-relaxed mb-4" {...props} />,
                strong: ({...props}) => <strong className="text-blue-900 block mt-2" {...props} />, // "block" force le retour à la ligne !
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
      <Protect fallback={<PricingTable />}><ConsultationForm /></Protect>
    </main>
  );
}
