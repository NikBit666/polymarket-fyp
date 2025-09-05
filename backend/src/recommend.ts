type Features = {
  stake: { avg_usdc_size: number, median_usdc_size: number },
  categories: Record<string, number>,
  tags: Record<string, number>,
  risk: { avg_dist_from_mid: number },
  horizon: { median_days: number },
  liquidityPreference: string
};

type Market = {
  conditionId: string,
  slug?: string,
  question?: string,
  category?: string,
  tags?: string[],
  endDate?: Date | string | null,
  bestBid?: number | null,
  bestAsk?: number | null,
  volume24h?: number | null,
  oneDayPriceChange?: number | null,
  liquidity?: number | null,
  enableOrderBook?: boolean | null
};

type Position = { conditionId: string };

function similarity(a: Record<string, number>, tags: string[] = []) {
  if (!tags.length) return 0;
  let s = 0;
  for (const t of tags) s += (a[t] || 0);
  return s / (Object.values(a).reduce((x,y)=>x+y,0) || 1);
}

function categoryMatch(catDist: Record<string, number>, c?: string) {
  if (!c) return 0;
  const total = Object.values(catDist).reduce((a,b)=>a+b,0) || 1;
  return (catDist[c] || 0)/total;
}

function horizonMatch(userDays: number, endDate?: any) {
  if (!endDate) return 0.2;
  const daysToEnd = Math.max(1, Math.round((new Date(endDate).getTime() - Date.now())/(24*3600*1000)));
  const diff = Math.abs(daysToEnd - userDays);
  // within +/- 30% gets full, else decay
  const tol = Math.max(3, Math.round(userDays * 0.3));
  return Math.max(0, 1 - (diff / (tol || 1)));
}

function riskMatch(userAvgDist: number, bestBid?: number | null, bestAsk?: number | null) {
  const mid = ( (bestBid ?? 0.5) + (bestAsk ?? 0.5) ) / 2;
  const dist = Math.abs(mid - 0.5);
  const diff = Math.abs(dist - userAvgDist);
  const tol = Math.max(0.05, userAvgDist * 0.6);
  return Math.max(0, 1 - (diff / tol));
}

function liquidityScore(liq?: number | null) {
  if (!liq || liq <= 0) return 0.1;
  // simple logistic-ish
  return Math.min(1, Math.log10(1 + liq) / 3);
}

export function makeRecommendations(features: Features, markets: Market[], positions: Position[]) {
  const held = new Set((positions || []).map(p => p.conditionId));
  const results = markets.map(m => {
    const tagSim = similarity(features.tags, m.tags);
    const catMatch = categoryMatch(features.categories, m.category);
    const horMatch = horizonMatch(features.horizon.median_days, m.endDate);
    const rMatch = riskMatch(features.risk.avg_dist_from_mid, m.bestBid ?? undefined, m.bestAsk ?? undefined);
    const liq = liquidityScore(m.liquidity ?? undefined);
    const vol = m.volume24h || 0;
    const mom = ((m.oneDayPriceChange ?? 0) + Math.log10(1 + vol)/6)/2; // blended

    const novelty = held.has(m.conditionId) ? -0.2 : 0;

    const score = 0.25*tagSim + 0.15*catMatch + 0.20*horMatch + 0.15*rMatch + 0.10*liq + 0.10*mom + 0.05*(1+novelty);
    const reasons: string[] = [];
    if (horMatch > 0.7) reasons.push('Matches your usual time frame');
    if (tagSim > 0.5) reasons.push('Tags you trade often');
    if (catMatch > 0.4) reasons.push(`You like ${m.category}`);
    if (rMatch > 0.6) reasons.push('Fits your risk pattern');
    if (liq > 0.6) reasons.push('High liquidity');
    if (mom > 0.5) reasons.push('Active in the last 24h');
    if (held.has(m.conditionId)) reasons.push('You already hold this (lowered rank)');
    return {
      conditionId: m.conditionId,
      slug: m.slug,
      question: m.question,
      category: m.category,
      tags: m.tags,
      endDate: m.endDate,
      bestBid: m.bestBid,
      bestAsk: m.bestAsk,
      volume24h: m.volume24h,
      score,
      reasons: reasons.slice(0,3)
    };
  }).sort((a,b)=> (b.score - a.score));

  return results.slice(0, 20);
}
