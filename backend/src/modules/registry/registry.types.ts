import type { ChangeSet } from './snapshot-diff';
export interface ParentEvidence {
  kind: 'relationship' | 'exception' | 'unavailable' | 'not-fetched';
  sourceUrl: string | null;
  record:
    | {
        attributes: {
          relationship?: {
            startNode: { id: string };
            endNode: { id: string };
            type: string;
            status: string;
          };
          registration?: { status: string; lastUpdateDate?: string };
          [key: string]: unknown;
        };
      }
    | unknown[]
    | null;
}
export interface RegistryRecord {
  retrievedAt?: string;
  lei: string;
  legalName: string;
  otherNames: string[];
  country: string;
  city: string;
  jurisdiction: string | null;
  category: string | null;
  entityStatus: string;
  registrationStatus: string;
  lastUpdate: string;
  nextRenewal: string | null;
  createdAt: string | null;
  groups: string[];
  sourceUrl: string;
  parents: { direct: ParentEvidence; ultimate: ParentEvidence };
  contextOnly: boolean;
}
export interface SnapshotMeta {
  changes?: ChangeSet;
  schemaVersion: number;
  fetchedAt: string;
  source: string;
  license: string;
  scope: string;
  seeds: { lei: string; label: string; sector: string }[];
  coverage: { lei: string; reportedDirectChildren: number }[];
  sourcePublishDates: string[];
  contentHash: string;
}
export interface RegistrySnapshot extends SnapshotMeta {
  entities: RegistryRecord[];
}
export function relationship(evidence: ParentEvidence) {
  if (
    evidence.kind !== 'relationship' ||
    !evidence.record ||
    Array.isArray(evidence.record)
  )
    return null;
  return evidence.record.attributes.relationship ?? null;
}
export function publishedParent(evidence: ParentEvidence): string | null {
  if (!evidence.record || Array.isArray(evidence.record)) return null;
  const rel = relationship(evidence);
  return rel?.status === 'ACTIVE' &&
    evidence.record.attributes.registration?.status === 'PUBLISHED'
    ? rel.endNode.id
    : null;
}
