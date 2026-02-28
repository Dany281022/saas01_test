"use client";

import React, { useState } from 'react';
import { useAuth, Protect, UserButton } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Composant PricingTable local pour éviter les erreurs de build
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

  // LOGIQUE DE FORMATAGE PRÉCISE POUR L'IMAGE DU PROF
  const formatOutput = (text: string) => {
    return text
      // 1. Force les titres principaux à être en GRAS et sur leur propre ligne (### devient **###**)
      .replace(/(### Summary of visit for the doctor's records)/g, '\n\n**$1**\n\n')
      .replace(/(### Next steps for the doctor)/g, '\n\n**$1**\n\n')
      .replace(/(### Draft of email to patient in patient-friendly language)/g, '\n\n**$1**\n\n')
      
      // 2. Force le gras sur les labels de données (Patient Name, etc.)
      .replace(/(Patient Name:|Date of Visit:|Reason for Visit:|Key Observations:)/g, '\n**$1**')
      
      // 3. S'assure que chaque étape 1., 2., 3. commence sur une nouvelle ligne
      .replace(/(\d\.)/g, '\n$1')
      
      // 4. Découpe la signature verticalement : chaque élément sur sa propre ligne
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
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Consultation Notes</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-700">Patient Name</label>
            <input type="text" placeholder="Patient's name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-700">Date of Visit</label>
            <DatePicker selected={visitDate} onChange={(d: Date | null) => setVisitDate(d)} className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1 text-gray-700">Notes</label>
          <textarea required rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter notes here..." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-[0.98]">
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-white p-10 rounded-xl shadow-2xl border border-gray-100">
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Titre en bleu comme demandé précédemment, mais formatOutput s'occupe du gras
                h3: ({...props}) => <h3 className="text-2xl font-bold text-blue-600 border-b pb-2 mb-6 mt-8" {...props} />,
                p: ({...props}) => <p className="text-gray-800 leading-relaxed mb-4 text-lg" {...props} />,
                li: ({...props}) => <li className="ml-6 mb-2 list-decimal text-gray-700" {...props} />,
                // Force les éléments en gras (labels et titres modifiés) à être bien visibles
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
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </div>
      <Protect fallback={<div className="container mx-auto px-4 py-20"><PricingTable /></div>}>
        <ConsultationForm />
      </Protect>
    </main>
  );
}
