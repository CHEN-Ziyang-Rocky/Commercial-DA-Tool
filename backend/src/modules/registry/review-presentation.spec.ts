import { reviewPresentation } from './review-presentation';
import { planDemoReviews } from './demo-reviews';
import { RegistryRecord } from './registry.types';
describe('Review presentation', () => {
  const records = Array.from({ length: 4 }, (_, i) => ({ lei: String(i).padStart(20, '0'), country: 'HK', groups: [], entityStatus: 'ACTIVE' }) as RegistryRecord);
  it('uses concise workflow wording while preserving original stored audit data', () => {
    const rows = planDemoReviews(records, [], Date.parse('2026-10-28T00:00:00Z'));
    const before = JSON.stringify(rows);
    for (const r of rows) {
      const presented = reviewPresentation(r.state);
      expect(presented.owner).not.toMatch(/Demo/i);
      expect(JSON.stringify(presented.history)).not.toMatch(/DEMO:|Demonstration|Demo ·/);
      expect(presented.history[0].actor).toBe('workflow-initializer');
      expect(presented.recordHash).toBe(r.state.recordHash);
      expect(presented.version).toBe(r.state.version);
    }
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('does not rewrite human audit entries or ordinary assessments', () => {
    const state = planDemoReviews(records, [])[0].state;
    const normal = { ...state, demo: undefined };
    expect(reviewPresentation(normal)).toBe(normal);
    const human = { ...state.history[1], actor: 'admin-id', note: 'Human assessment wording retained.', version: 3 };
    const changed = { ...state, note: human.note, version: 3, history: [...state.history, human] };
    expect(reviewPresentation(changed).history[2]).toBe(human);
    expect(reviewPresentation(changed).note).toBe(human.note);
  });
});
