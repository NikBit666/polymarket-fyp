'use client';

import { useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type Rec = {
  conditionId: string;
  slug?: string;
  question?: string;
  category?: string;
  tags?: string[];
  endDate?: string;
  bestBid?: number;
  bestAsk?: number;
  volume24h?: number;
  score: number;
  reasons: string[];
};

export default function Page() {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [value, setValue] = useState<number | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      await fetch(`${BACKEND}/markets/index`, { method: 'POST' });
      const ing = await fetch(`${BACKEND}/ingest/${wallet}`, { method: 'POST' });
      const ingJson = await ing.json();
      if (ing.status >= 400) throw new Error(ingJson.error || 'ingest failed');
      setResolved(ingJson.resolvedWallet || wallet);
      const r = await fetch(`${BACKEND}/recommend/${wallet}`);
      const rJson = await r.json();
      if (r.status >= 400) throw new Error(rJson.error || 'recommend failed');
      setRecs(rJson);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-2">Polymarket — For You</h1>
      <p className="text-sm text-gray-400 mb-6">Enter your EOA or proxy wallet to get a personalized market feed. Read-only; no keys ever.</p>

      <div className="flex gap-3 mb-6">
        <input
          placeholder="0x... or ENS"
          value={wallet}
          onChange={(e)=>setWallet(e.target.value)}
          className="flex-1 rounded-xl bg-[#111218] border border-gray-700 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={run} disabled={loading || !wallet} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 disabled:opacity-50">
          {loading ? 'Analyzing...' : 'Get my feed'}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 mb-6">{error}</div>}

      {resolved && (
        <div className="mb-6 text-sm text-gray-300">
          Resolved wallet: <span className="font-mono">{resolved}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recs.map((m)=> (
          <div key={m.conditionId} className="rounded-2xl bg-[#111218] border border-gray-800 p-4 shadow-md">
            <div className="text-xs text-gray-400 mb-2">{m.category || '—'}</div>
            <div className="font-medium mb-2">{m.question || m.slug}</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {(m.tags || []).slice(0,4).map(t => <span key={t} className="text-xs px-2 py-1 rounded-full border border-gray-700 text-gray-300">{t}</span>)}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>Bid/Ask: <span className="font-mono">{m.bestBid?.toFixed(2) ?? '—'} / {m.bestAsk?.toFixed(2) ?? '—'}</span></div>
              <div>Vol 24h: <span className="font-mono">{m.volume24h ? Math.round(m.volume24h).toLocaleString() : '—'}</span></div>
            </div>
            <div className="mt-3 text-xs text-gray-400">Why here: {m.reasons.join(' • ') || 'Good fit'}</div>
            <div className="mt-3 text-xs text-gray-500">Ends: {m.endDate ? new Date(m.endDate).toLocaleString() : '—'}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
