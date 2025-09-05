import { Router } from 'express';
import { prisma } from './prisma';

export const profileRouter = Router();

profileRouter.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const profile = await prisma.user.findUnique({
      where: { wallet },
      include: {
        bets: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});