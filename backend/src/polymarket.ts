import axios from 'axios';
import { ethers } from 'ethers';

export function normalizeAddress(addr: string): string {
  if (!addr) throw new Error('empty address');
  if (addr.endsWith('.eth')) return addr; // allow ENS through to frontend to resolve if you prefer
  return ethers.getAddress(addr);
}

export async function fetchPositions(user: string) {
  const url = `https://data-api.polymarket.com/positions?user=${user}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  // normalize minimal fields
  return (data || []).map((p: any) => ({
    conditionId: p.conditionId || p.condition_id || p.marketId || p.id,
    outcomeIndex: p.outcomeIndex ?? p.outcome_index ?? 0,
    size: p.size,
    avgPrice: p.avgPrice,
    initialValue: p.initialValue,
    currentValue: p.currentValue,
    cashPnl: p.cashPnl,
    percentPnl: p.percentPnl,
    endDate: p.endDate,
    slug: p.slug,
    title: p.title || p.question,
    category: p.category,
    tags: p.tags || []
  }));
}

export async function fetchActivity(user: string, limit = 1000) {
  const url = `https://data-api.polymarket.com/activity?user=${user}&limit=${limit}`;
  const { data } = await axios.get(url, { timeout: 20000 });
  return data || [];
}

export async function fetchValue(user: string) {
  const url = `https://data-api.polymarket.com/value?user=${user}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data || null;
}

export async function fetchGammaMarkets() {
  const url = `https://gamma-api.polymarket.com/markets?closed=false&limit=1000&order=-volume24hr&include_tag=true`;
  const { data } = await axios.get(url, { timeout: 20000 });
  // Some payloads use different keys; map to consistent shape
  return (data || []).map((m: any) => ({
    conditionId: m.conditionId || m.id || m.condition_id,
    slug: m.slug,
    question: m.question,
    category: m.category,
    tags: m.tags || [],
    endDate: m.endDate,
    bestBid: m.bestBid,
    bestAsk: m.bestAsk,
    volume24hr: m.volume24hr,
    oneDayPriceChange: m.oneDayPriceChange,
    liquidityNum: m.liquidityNum,
    enableOrderBook: m.enableOrderBook,
    clobTokenIds: m.clobTokenIds || []
  }));
}

export async function fetchClobMarket(conditionId: string) {
  const url = `https://clob.polymarket.com/markets/${conditionId}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data;
}
