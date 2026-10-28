import { recordFingerprint, ReviewState } from './governance';
import { RegistryRecord } from './registry.types';

const scenarios: { scenario: NonNullable<ReviewState['demo']>['scenario']; preferred: string; owner: string }[] = [
  { scenario: 'open', preferred: '549300HVTWB0GJZ16V92', owner: 'Demo · Entity operations' },
  { scenario: 'overdue', preferred: '5493001KQW6DM7KEDR62', owner: 'Demo · Finance control' },
  { scenario: 'evidence_changed', preferred: '254900OM3MAXYK8PCC84', owner: 'Demo · Data governance' },
  { scenario: 'reviewed', preferred: 'HWUPKR0MPOU8FGXBT394', owner: 'Demo · Legal team' },
];
export function planDemoReviews(records: RegistryRecord[], existing: { lei: string; state: ReviewState }[], now = Date.now(), perScenario = 1) {
  if (!Number.isInteger(perScenario) || perScenario < 1 || perScenario > 25) throw new Error('Per-scenario count must be an integer from 1 to 25');
  const used = new Set(existing.map((r) => r.lei));
  const countryCounts = new Map<string, number>();
  for (const r of records.filter((r) => used.has(r.lei))) countryCounts.set(r.country, (countryCounts.get(r.country) ?? 0) + 1);
  const at = new Date(now).toISOString();
  const days = (offset: number) => new Date(now + offset * 86400000).toISOString().slice(0, 10);
  const planned: { lei: string; state: ReviewState }[] = [];
  for (const { scenario, preferred, owner } of scenarios) {
    const count = existing.filter((r) => r.state.demo?.scenario === scenario).length;
    for (let index = count; index < perScenario; index++) {
    const record = records.find((r) => r.lei === preferred && !used.has(r.lei)) ??
      [...records].filter((r) => !used.has(r.lei) && r.entityStatus === 'ACTIVE').sort((a, b) =>
        Number(b.groups.includes(b.lei)) - Number(a.groups.includes(a.lei)) ||
        (countryCounts.get(a.country) ?? 0) - (countryCounts.get(b.country) ?? 0) || a.lei.localeCompare(b.lei))[0];
    if (!record) throw new Error('Not enough unassigned entities to create demonstration tasks');
    used.add(record.lei);
    countryCounts.set(record.country, (countryCounts.get(record.country) ?? 0) + 1);
    const simulated = scenario === 'evidence_changed';
    const recordHash = recordFingerprint(simulated ? { ...record, lastUpdate: '2000-01-01T00:00:00Z' } : record);
    const dueDate = days(scenario === 'overdue' ? -[7, 3, 14, 1][index % 4] : [14, 7, 21, 30][index % 4]);
    const status = scenario === 'reviewed' || simulated ? 'reviewed' : scenario === 'open' && index % 2 ? 'open' : 'in_progress';
    const note = scenario === 'open' ? 'DEMO: Verify the published legal name and recorded parent relationship; document the next action.' :
      scenario === 'overdue' ? 'DEMO: The task deadline has passed. Follow up with the assigned team and document the evidence checked.' :
      simulated ? 'DEMO: This assessment uses a deliberately simulated older fingerprint. Re-check current evidence and save a new assessment to clear the stale flag. The public source record has not been altered.' :
      'DEMO: Current public identity and relationship evidence checked for this workflow example. This is a simulated internal assessment.';
    const history = [
      { version: 1, status: 'open', owner, dueDate, note: 'DEMO: Demonstration task created; no real employee assignment or client conclusion.', actor: 'demo-seed', at, recordHash },
      { version: 2, status, owner, dueDate, note, actor: 'demo-seed', at, recordHash },
    ];
    planned.push({ lei: record.lei, state: { version: 2, status, owner, dueDate, note, recordHash, updatedAt: at, history,
      demo: { scenario, seededAt: at, simulatedPriorEvidence: simulated } } });
    }
  }
  return planned;
}
