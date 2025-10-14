import { Router } from 'express';
import { listAllPayments } from './payments.repository';

const dashboardRouter = Router();

dashboardRouter.get('/summary', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const all = listAllPayments();
  const summary = all.reduce<Record<string, { count: number; total: number }>>((acc, payment) => {
    const bucket = acc[payment.status] ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += payment.amountAed;
    acc[payment.status] = bucket;
    return acc;
  }, {});
  const totals = all.reduce(
    (acc, payment) => {
      acc.count += 1;
      acc.total += payment.amountAed;
      return acc;
    },
    { count: 0, total: 0 }
  );
  return res.json({
    summary,
    totals,
    generatedAt: new Date().toISOString()
  });
});

export default dashboardRouter;
