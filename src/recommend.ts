import { Router } from 'express';
import { prisma } from './prisma';

export const recommendRouter = Router();

recommendRouter.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Simple recommendation logic - return random markets for now
    const recommendations = [
      { id: '1', title: 'Sample Market 1', probability: 0.65 },
      { id: '2', title: 'Sample Market 2', probability: 0.42 },
      { id: '3', title: 'Sample Market 3', probability: 0.78 }
    ];

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});