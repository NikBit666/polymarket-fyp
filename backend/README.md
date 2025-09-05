# Polymarket FYP — Backend

Local dev steps:

1) Install deps
```bash
cd backend
npm i
```

2) Initialize SQLite schema
```bash
npm run db:push
```

3) Run dev server
```bash
npm run dev
```

- Server runs on **http://localhost:4000**
- Endpoints:
  - `POST /ingest/:wallet`
  - `GET  /profile/:wallet`
  - `POST /markets/index`
  - `GET  /recommend/:wallet`

Typical flow:

```bash
# index markets
curl -X POST http://localhost:4000/markets/index

# ingest a wallet (EOA or proxy)
curl -X POST http://localhost:4000/ingest/0xYourWallet

# get recommendations
curl http://localhost:4000/recommend/0xYourWallet
```

Notes:
- Uses public Polymarket endpoints (Gamma + Data-API). No keys required.
- SQLite lives at `backend/prisma/dev.db`.
