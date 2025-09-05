import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import prisma from './prisma';
import { normalizeAddress, fetchPositions, fetchActivity, fetchValue, fetchGammaMarkets, fetchClobMarket } from './polymarket.js';
import { computeProfileFeatures } from './profile.js';
import { makeRecommendations } from './recommend.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Ingest wallet: pulls activity/positions/value, resolves proxy wallet, stores features + positions
app.post('/ingest/:wallet', async (req, res) => {
  try {
    const wallet = normalizeAddress(req.params.wallet);
    // Try direct positions
    let positions = await fetchPositions(wallet);
    // Pull activity to see if there's a proxy
    const activity = await fetchActivity(wallet, 1000);
    const proxyWallet = activity.find((a:any) => a.proxyWallet)?.proxyWallet;
    if ((!positions || positions.length === 0) && proxyWallet) {
      positions = await fetchPositions(proxyWallet);
    }
    const useWallet = (positions && positions.length > 0 && proxyWallet) ? proxyWallet : wallet;

    // Save user record
    await prisma.user.upsert({
      where: { walletInput: wallet },
      create: { walletInput: wallet, proxyWallet: proxyWallet || null, totalValueUsd: null },
      update: { proxyWallet: proxyWallet || null }
    });

    // Save positions
    if (positions && positions.length > 0) {
      const posWrites = positions.map((p:any) => prisma.position.upsert({
        where: { id: `${useWallet}-${p.conditionId}-${p.outcomeIndex}` },
        create: {
          id: `${useWallet}-${p.conditionId}-${p.outcomeIndex}`,
          wallet: useWallet,
          conditionId: p.conditionId,
          outcomeIndex: p.outcomeIndex ?? 0,
          size: p.size ?? null,
          avgPrice: p.avgPrice ?? null,
          initialValue: p.initialValue ?? null,
          currentValue: p.currentValue ?? null,
          cashPnl: p.cashPnl ?? null,
          percentPnl: p.percentPnl ?? null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          slug: p.slug ?? null,
          title: p.title ?? null,
          category: p.category ?? null,
          tags: p.tags ?? []
        },
        update: {
          size: p.size ?? null,
          avgPrice: p.avgPrice ?? null,
          initialValue: p.initialValue ?? null,
          currentValue: p.currentValue ?? null,
          cashPnl: p.cashPnl ?? null,
          percentPnl: p.percentPnl ?? null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          slug: p.slug ?? null,
          title: p.title ?? null,
          category: p.category ?? null,
          tags: p.tags ?? []
        }
      }));
      await prisma.$transaction(posWrites);
    }

    // Save value
    const v = await fetchValue(useWallet);
    if (v && typeof v.total === 'number') {
      await prisma.user.update({ where: { walletInput: wallet }, data: { totalValueUsd: v.total } });
    }

    // Compute profile features
    const features = computeProfileFeatures(activity, positions || []);
    await prisma.profileFeatures.upsert({
      where: { wallet: useWallet },
      create: { wallet: useWallet, features },
      update: { features }
    });

    res.json({ walletInput: wallet, resolvedWallet: useWallet, featuresCount: Object.keys(features).length, positions: positions?.length || 0 });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'ingest failed' });
  }
});

// Get profile
app.get('/profile/:wallet', async (req, res) => {
  try {
    const wallet = normalizeAddress(req.params.wallet);
    const user = await prisma.user.findUnique({ where: { walletInput: wallet } });
    const resolved = user?.proxyWallet || wallet;
    const features = await prisma.profileFeatures.findUnique({ where: { wallet: resolved } });
    res.json({ walletInput: wallet, resolvedWallet: resolved, features: features?.features || {} });
  } catch (e:any) {
    res.status(500).json({ error: e.message || 'profile failed' });
  }
});

// Refresh market index
app.post('/markets/index', async (_req, res) => {
  try {
    const data = await fetchGammaMarkets();
    const writes = data.map((m:any) => prisma.market.upsert({
      where: { conditionId: m.conditionId || m.id || m.condition_id },
      create: {
        conditionId: m.conditionId || m.id || m.condition_id,
        slug: m.slug || null,
        question: m.question || null,
        category: m.category || null,
        tags: m.tags || [],
        endDate: m.endDate ? new Date(m.endDate) : null,
        bestBid: m.bestBid ?? null,
        bestAsk: m.bestAsk ?? null,
        volume24h: m.volume24hr ?? null,
        oneDayPriceChange: m.oneDayPriceChange ?? null,
        liquidity: m.liquidityNum ?? null,
        enableOrderBook: m.enableOrderBook ?? null,
        clobTokenIds: m.clobTokenIds || []
      },
      update: {
        slug: m.slug || null,
        question: m.question || null,
        category: m.category || null,
        tags: m.tags || [],
        endDate: m.endDate ? new Date(m.endDate) : null,
        bestBid: m.bestBid ?? null,
        bestAsk: m.bestAsk ?? null,
        volume24h: m.volume24hr ?? null,
        oneDayPriceChange: m.oneDayPriceChange ?? null,
        liquidity: m.liquidityNum ?? null,
        enableOrderBook: m.enableOrderBook ?? null,
        clobTokenIds: m.clobTokenIds || []
      }
    }));
    await prisma.$transaction(writes);
    res.json({ indexed: data.length });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'index failed' });
  }
});

// Recommend
app.get('/recommend/:wallet', async (req, res) => {
  try {
    const wallet = normalizeAddress(req.params.wallet);
    const user = await prisma.user.findUnique({ where: { walletInput: wallet } });
    const resolved = user?.proxyWallet || wallet;
    const features = await prisma.profileFeatures.findUnique({ where: { wallet: resolved } });
    if (!features) {
      return res.status(400).json({ error: 'No profile found. Call /ingest/:wallet first.' });
    }
    const markets = await prisma.market.findMany();
    const positions = await prisma.position.findMany({ where: { wallet: resolved } });
    const recs = makeRecommendations(features.features as any, markets as any, positions as any);
    res.json(recs);
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'recommend failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
