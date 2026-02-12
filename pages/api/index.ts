import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: Generating business ideas...\n\n`);

  const ideas = [
    "AI-powered resume analyzer",
    "Smart budgeting app for students",
    "Local service marketplace with AI matching",
  ];

  for (const idea of ideas) {
    await new Promise((r) => setTimeout(r, 1000));
    res.write(`data: ${idea}\n\n`);
  }

  res.end();
}

