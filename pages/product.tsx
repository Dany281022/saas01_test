"use client";

import React, { useState } from 'react';
import { useAuth, Protect, UserButton } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Composant de secours pour éviter l'erreur de build si PricingTable n'est pas importé
const PricingTable = () => (
  <div className="p-12 text-center border-2 border-dashed rounded-xl bg-gray-50">
    <h2 className="text-2xl font-bold mb-4">Plan Premium Requis</h2>
    <p className="text-gray-600">Veuillez mettre à jour votre abonnement pour accéder à l'outil de consultation.</p>
  </div>
);

function ConsultationForm() {
  const { getToken } = useAuth();
  const [patientName, setPatientName] = useState<string>('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // RÉPARATION VISUELLE : Gère le gras et les sauts de ligne pour correspondre à l'image du prof
  const formatOutput = (text: string) => {
    return text
      // Force le gras sur les étiquettes de données (Patient Name, etc.)
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n**$1**')
      // S'assure que les listes numérotées commencent bien sur une nouvelle ligne
      .replace(/(\d\.)/g, '\n$1')
      // Isole "Take care," et la signature pour qu'ils ne soient pas collés
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
      if (!jwt) return;

      await fetchEventSource('/api', {
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
          if (ev.data === "[DONE]") { 
            setLoading(false); 
            return; 
          }
          setOutput((prev) => prev + ev.data);
        },
        onclose() { setLoading(false); },
        onerror(err) { 
            console.error(err);
            setLoading(false); 
        }
      });
    } catch (err: any) { 
      console.error(err);
      setLoading(false); 
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Consultation Notes</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Patient Name</label>
            <input type="text" placeholder="Ex: Dany" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Date of Visit</label>
            <DatePicker selected={visitDate} onChange={(d: Date | null) => setVisitDate(d)} className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Clinical Notes</label>
          <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter patient symptoms and observations..." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-[0.98]">
          {loading ? 'Generating Summary...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white p-10 rounded-xl shadow-2xl border border-blue-50 animate-in fade-in duration-500">
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Titres stylisés en bleu comme sur l'image du prof
                h3: ({...props}) => <h3 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-50 pb-2 mb-6 mt-8" {...props} />,
                // Texte principal
                p: ({...props}) => <p className="text-gray-700 leading-relaxed mb-3 text-lg" {...props} />,
                // Listes pour les Next Steps
                li: ({...props}) => <li className="ml-6 mb-2 list-decimal text-gray-700 font-medium" {...props} />,
                // Labels mis en gras
                strong: ({...props}) => <strong className="text-gray-900 font-bold inline-block mt-2" {...props} />,
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
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </div>
      <Protect fallback={<div className="container mx-auto px-4 py-20"><PricingTable /></div>}>
        <ConsultationForm />
      </Protect>
    </main>
  );
}
