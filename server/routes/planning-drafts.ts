import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();
const DEFAULT_USER = 'default-user';

// POST /api/planning-drafts — save a single draft task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId = DEFAULT_USER, sessionId, title, description, payload } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'payload is required' });
    }

    const draft = await prisma.planningDraft.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        title,
        description: description ?? null,
        payload,
        status: 'draft',
      },
    });

    res.json({ ok: true, draft });
  } catch (error: any) {
    console.error('POST /api/planning-drafts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/planning-drafts?userId=default-user&sessionId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || DEFAULT_USER;
    const sessionId = req.query.sessionId as string | undefined;

    const where: any = { userId, status: 'draft' };
    if (sessionId) where.sessionId = sessionId;

    const drafts = await prisma.planningDraft.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ ok: true, drafts });
  } catch (error: any) {
    console.error('GET /api/planning-drafts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/planning-drafts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.planningDraft.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Draft not found' });
    }
    console.error('DELETE /api/planning-drafts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/planning-drafts — clear all drafts for a user/session
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || DEFAULT_USER;
    const sessionId = req.query.sessionId as string | undefined;

    const where: any = { userId, status: 'draft' };
    if (sessionId) where.sessionId = sessionId;

    const result = await prisma.planningDraft.deleteMany({ where });
    res.json({ ok: true, deletedCount: result.count });
  } catch (error: any) {
    console.error('DELETE /api/planning-drafts (bulk) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
