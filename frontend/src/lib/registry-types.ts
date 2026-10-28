export interface Evidence {
  kind: string;
  sourceUrl: string | null;
  record:
    | {
        attributes?: {
          relationship?: {
            startNode: { id: string };
            endNode: { id: string };
            status: string;
            type: string;
          };
          registration?: { status: string };
          [key: string]: unknown;
        };
      }
    | unknown[]
    | null;
}
export interface CompanyOption {
  lei: string; label: string; legalName: string; otherNames: string[];
  sector: string; country: string; featured: boolean;
}
export interface LegalEntity {
  retrievedAt?: string;
  hierarchyLevel?: string | null;
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
  groups: string[];
  sourceUrl: string;
  parents: { direct: Evidence; ultimate: Evidence };
  contextOnly: boolean;
  reviewFlags?: string[];
  review?: Pick<
    ReviewState,
    "version" | "status" | "owner" | "dueDate" | "updatedAt" | "demo"
  > | null;
  reviewStale?: boolean;
  renewal?: string;
}
export interface RegistryMeta {
  supplementalBatches?: { fetchedAt: string; seeds: string[]; entities: number }[];
  changes?: Omit<ChangeSet, "entries">;
  cohorts?: {
    country: string;
    fetchedAt?: string;
    returned: number;
    availableAtSource: number;
    truncated: boolean;
    sort: string;
  }[];
  fetchedAt: string;
  scope: string;
  contentHash: string;
  sourcePublishDates: string[];
  seeds: { lei: string; label: string; sector: string }[];
}
export interface RegistryList {
  overview: {
    countries: number;
    connectedParents: number;
    assignedReviews: number;
    demoReviews: number;
    renewalBuckets: { bucket: string; count: number }[];
    reviewQueue: { lei: string; legalName: string; status: string; owner: string; dueDate: string;
      stale: boolean; overdue: boolean; demo: ReviewState["demo"] | null }[];
  };
  metadata: RegistryMeta;
  portfolios: {
    lei: string;
    label: string;
    sector: string;
    total: number;
    overdue: number;
    upcoming: number;
    review: number;
  }[];
  leiStatuses: { status: string; count: number }[];
  orphanedReviews: {
    lei: string;
    owner: string;
    status: string;
    dueDate: string;
  }[];
  total: number;
  page: number;
  limit: number;
  items: LegalEntity[];
  summary: {
    entities: number;
    overdueRenewals: number;
    due30: number;
    due90: number;
    unknownRenewals: number;
    unassigned: number;
    openReviews: number;
    overdueReviews: number;
    staleReviews: number;
    reviewed: number;
    jurisdictions: number;
    review: number;
    parentExceptions: number;
  };
  distribution: { country: string; count: number }[];
  options: {
    cities: string[];
    registrationStatuses: string[];
    countries: string[];
    groups: RegistryMeta["seeds"];
  };
  snapshotAgeDays: number;
}
export interface RegistryDetail {
  evidenceVersion: string;
  record: LegalEntity;
  review: ReviewState | null;
  reviewStale: boolean;
  metadata: RegistryMeta;
  reviewFlags: string[];
  ancestors: LegalEntity[];
  stopReason: string;
  directParent: LegalEntity | null;
  ultimateParent: LegalEntity | null;
  children: LegalEntity[];
  coverage: { reportedDirectChildren: number } | null;
}
export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export interface ReviewState {
  demo?: { scenario: "open" | "overdue" | "evidence_changed" | "reviewed"; seededAt: string; simulatedPriorEvidence: boolean } | null;
  version: number;
  status: "open" | "in_progress" | "reviewed";
  owner: string;
  dueDate: string;
  note: string;
  updatedAt: string;
  history: {
    version: number;
    status: string;
    owner: string;
    dueDate: string;
    note: string;
    actor: string;
    at: string;
  }[];
}

export interface ChangeSet {
  comparedAt: string;
  previousFetchedAt: string | null;
  currentFetchedAt: string;
  initial: boolean;
  added: number;
  removed: number;
  changed: number;
  entries: {
    lei: string;
    legalName: string;
    kind: "added" | "removed" | "changed";
    fields: { field: string; before: string; after: string }[];
  }[];
}

export interface RegistryChanges {
  changes: ChangeSet | null;
  orphanedReviews: RegistryList["orphanedReviews"];
}
