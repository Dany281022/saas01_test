"use client";

import React, { useState } from 'react';
import { useAuth, Protect, UserButton } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const PricingTable = () => (
  <div className="p-12 text-center border-2 border-dashed rounded-xl bg-gray-50">
    <h2 className="text-2xl font-bold mb-4">Plan Premium Requis</h2>
    <p className="text-gray-600">Veuillez mettre à jour votre abonnement pour accéder à l'outil.</p>
  </div>
);

function ConsultationForm() {
  const { getToken } = useAuth();
  const [patientName, setPatientName] = useState<string>('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 1. LA FONCTION DE NETTOYAGE (FORMATAGE)
  const formatOutput = (text: string) => {
    return text
      // Supprime les ### et met en gras les titres de section
      .replace(/### (Summary of visit for the doctor's records)/g, '\n\n**$1**\n\n')
      .replace(/### (Next steps for the doctor)/g, '\n\n**$1**\n\n')
      .replace(/### (Draft of email to patient in patient-friendly language)/g, '\n\n**$1**\n\n')
      
      // Force le gras sur les labels de données
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n**$1**')
      
      // FIX ALIGNEMENT : Supprime les sauts de ligne après "1." ou "2." et met le chiffre en gras
      .replace(/(\d\.)\s*\n+/g, '$1 ')
      .replace(/(\d\.)\s+/g, '\n**$1** ')
      
      // Espacement email (nouveaux paragraphes)
      .replace(/\. ([A-Z])/g, '.\n\n$1')
      
      // Signature verticale
      .replace(/(Take care,)/g, '\n\n$1\n')
      .replace(/(\[Doctor's Name\])/g, '\n$1\n')
      .replace(/(\[Doctor's Contact Information\])/g, '\n$1')
      
      .trim();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOutput('');
    setLoading(true);
    try {
      const jwt = await getToken();
      if (!jwt) return;
      
      // MODIFICATION DAY 5 : Appel vers /api/consultation (conforme au guide page 14)
      await fetchEventSource('/api/consultation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${jwt}` 
        },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: visitDate?.toISOString().slice(0, 10),
          notes: notes,
        }),
        onmessage(ev) {
          if (ev.data === "[DONE]") { setLoading(false); return; }
          setOutput((prev) => prev + ev.data);
        },
        onclose() { setLoading(false); },
        onerror(err) { console.error(err); setLoading(false); }
      });
    } catch (err: any) { 
      console.error(err);
      setLoading(false); 
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Consultation Notes</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-700">Patient Name</label>
            <input type="text" placeholder="Name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-700">Date</label>
            <DatePicker selected={visitDate} onChange={(d: Date | null) => setVisitDate(d)} className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1 text-gray-700">Clinical Notes</label>
          <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter details..." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-[0.98]">
          {loading ? 'Processing...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white p-10 rounded-xl shadow-2xl border border-gray-100">
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h3: ({...props}) => <h3 className="text-2xl font-bold text-blue-600 border-b pb-2 mb-6 mt-8" {...props} />,
                ol: ({children}) => <div className="space-y-2 mb-4 mt-2">{children}</div>,
                li: ({children}) => <div className="text-gray-800 text-lg leading-relaxed">{children}</div>,
                p: ({...props}) => <p className="text-gray-800 leading-relaxed mb-4 text-lg" {...props} />,
                strong: ({...props}) => <strong className="text-gray-900 font-bold" {...props} />,
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
    <main className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="absolute top-4 right-4"><UserButton afterSignOutUrl="/" /></div>
      <Protect fallback={<div className="container mx-auto px-4 py-20"><PricingTable /></div>}>
        <ConsultationForm />
      </Protect>
    </main>
  );
}
