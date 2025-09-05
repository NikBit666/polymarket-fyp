import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import { polymarketRouter } from './polymarket';
import { profileRouter } from './profile';
import { recommendRouter } from './recommend';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/markets', polymarketRouter);
app.use('/profile', profileRouter);
app.use('/recommend', recommendRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});