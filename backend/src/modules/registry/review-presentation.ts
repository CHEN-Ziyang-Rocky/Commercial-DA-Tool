import { ReviewState } from './governance';

// Keep the original initialized audit data in storage; present concise workflow wording.
export function reviewPresentation(state: ReviewState): ReviewState {
  if (!state.demo) return state;
  const owner = (text: string) => text.replace(/^Demo\s*·\s*/i, '');
  const note = (status: string, version: number) => {
    if (version === 1) return 'Review task created and assigned to the responsible team.';
    if (state.demo!.scenario === 'evidence_changed')
      return 'This assessment references an earlier evidence version. Re-check the current legal identity and parent evidence before recording a new assessment.';
    if (status === 'reviewed') return 'Identity and parent-evidence assessment recorded against the current evidence version.';
    if (state.demo!.scenario === 'overdue')
      return 'The review deadline has passed. Follow up with the responsible team and record the evidence checked and next action.';
    return 'Verify the published legal name and recorded parent relationship; document the next action.';
  };
  return { ...state, owner: owner(state.owner),
    note: state.history.at(-1)?.actor === 'demo-seed' ? note(state.status, state.version) : state.note,
    history: state.history.map((h) => h.actor === 'demo-seed'
      ? { ...h, owner: owner(h.owner), note: note(h.status, h.version), actor: 'workflow-initializer' }
      : h),
  };
}
