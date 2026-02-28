// pages/api/summarize.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { patientName, date, notes } = req.body

    // Génère un résumé simulé
    const summary = `Résumé pour ${patientName} (${date}) : ${notes.slice(0, 50)}...`

    res.status(200).json({ summary })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
