import { renewalBucket, reviewIsStale, ReviewState } from './governance';
import { publishedParent, RegistryRecord } from './registry.types';
import { reviewPresentation } from './review-presentation';

export function managementSummary(records: RegistryRecord[], universe: RegistryRecord[], reviews: { lei: string; state: ReviewState }[], now = Date.now()) {
  const ids = new Set(universe.map((r) => r.lei));
  const byId = new Map(reviews.map((r) => [r.lei, r.state]));
  const today = new Date(now).toISOString().slice(0, 10);
  const renewalOrder = ['overdue', 'due-30', 'due-90', 'later', 'unknown', 'not-applicable'];
  const renewalCounts = new Map(renewalOrder.map((bucket) => [bucket, 0]));
  const queue = records.flatMap((record) => {
    const bucket = renewalBucket(record, now);
    renewalCounts.set(bucket, (renewalCounts.get(bucket) ?? 0) + 1);
    const review = byId.get(record.lei);
    if (!review) return [];
    const stale = reviewIsStale(review, record);
    const overdue = review.status !== 'reviewed' && review.dueDate < today;
    return [{ lei: record.lei, legalName: record.legalName, status: review.status,
      owner: reviewPresentation(review).owner, dueDate: review.dueDate, stale, overdue, demo: review.demo ?? null }];
  });
  queue.sort((a, b) => Number(b.stale) - Number(a.stale) || Number(b.overdue) - Number(a.overdue) ||
    Number(a.status === 'reviewed') - Number(b.status === 'reviewed') || a.dueDate.localeCompare(b.dueDate) || a.lei.localeCompare(b.lei));
  return {
    countries: new Set(records.map((r) => r.country)).size,
    connectedParents: records.filter((r) => ids.has(publishedParent(r.parents.direct) ?? '')).length,
    assignedReviews: queue.length,
    demoReviews: queue.filter((r) => r.demo).length,
    renewalBuckets: renewalOrder.map((bucket) => ({ bucket, count: renewalCounts.get(bucket) ?? 0 })),
    reviewQueue: queue.slice(0, 6),
  };
}
