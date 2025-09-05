type Activity = any;
type Position = any;

export function computeProfileFeatures(activity: Activity[], positions: Position[]) {
  // Stake size profile
  const sizes: number[] = [];
  for (const a of activity) {
    const usdc = a.usdcSize ?? a.usdSize ?? a.notional ?? 0;
    if (typeof usdc === 'number' && usdc > 0) sizes.push(usdc);
  }
  const avg_usdc_size = sizes.length ? sizes.reduce((a,b)=>a+b,0)/sizes.length : 0;
  const median_usdc_size = sizes.length ? sizes.sort((a,b)=>a-b)[Math.floor(sizes.length/2)] : 0;

  // Category/tag affinity
  const catCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};
  for (const p of positions) {
    if (p.category) catCount[p.category] = (catCount[p.category] || 0) + 1;
    for (const t of (p.tags || [])) tagCount[t] = (tagCount[t] || 0) + 1;
  }

  // Risk appetite: distance from 0.5 for entries (approximate from activity.price)
  const dists: number[] = [];
  for (const a of activity) {
    const price = a.price ?? a.avgPrice;
    if (typeof price === 'number') dists.push(Math.abs(price - 0.5));
  }
  const avg_dist_from_mid = dists.length ? dists.reduce((a,b)=>a+b,0)/dists.length : 0;

  // Horizon preference (approximate using positions endDate vs first trade time if present)
  let sumDays = 0, cnt = 0;
  for (const p of positions) {
    if (p.endDate) {
      const end = new Date(p.endDate).getTime();
      // fallback horizon: 21 days if no trade time available
      const assumedEntry = Date.now() - (21 * 24 * 3600 * 1000);
      const horizonDays = Math.max(1, Math.round((end - assumedEntry)/ (24*3600*1000)));
      sumDays += horizonDays;
      cnt += 1;
    }
  }
  const medianHorizonDays = cnt ? Math.round(sumDays/cnt) : 21;

  // Liquidity sensitivity could be refined with fills vs market liquidity; placeholder
  const liquidityPreference = 'high';

  return {
    stake: { avg_usdc_size, median_usdc_size },
    categories: catCount,
    tags: tagCount,
    risk: { avg_dist_from_mid },
    horizon: { median_days: medianHorizonDays },
    liquidityPreference
  };
}
