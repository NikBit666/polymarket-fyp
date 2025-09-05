import { Router } from 'express';
import axios from 'axios';

export const polymarketRouter = Router();

polymarketRouter.get('/index', async (req, res) => {
  try {
    const response = await axios.get('https://gamma-api.polymarket.com/markets');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});