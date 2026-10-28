import { CompanyPicker } from "@/components/CompanyPicker";
import { WorkspaceHelp } from "@/components/WorkspaceHelp";
import ManagementCharts from "@/components/ManagementCharts";
import {
  Alert,
  Box,
  Button,
  Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { useApiData } from "@/lib/useApiData";
import { RegistryList, countryName, CompanyOption } from "@/lib/registry-types";
export default function Overview() {
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const companies = useApiData<{ total: number; items: CompanyOption[] }>("/registry/company-options");
  const scope = new URLSearchParams();
  portfolio.forEach((lei) => scope.append("portfolio", lei));
  const { data, loading, error, reload } = useApiData<RegistryList>(`/registry?limit=1&${scope}`);
  const drill = (filter: string) => `/entities?${scope}&${filter}`;
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          ENTITY GOVERNANCE · MANAGEMENT BRIEFING
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          Your entity portfolio at a glance
        </Typography>
        <Typography color="text.secondary" mt={1}>
          Understand coverage, renewal workload and review progress across the entire register or a selected portfolio.
        </Typography>
      </Box>
      <Alert severity="info">
        Reference universe from public GLEIF records. Choose a portfolio to
        review selected group relationships. These entities are not represented
        as your clients or your own subsidiaries.
      </Alert>
      <WorkspaceHelp />
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={reload}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
          <CompanyPicker multiple options={companies.data?.items ?? []} loading={companies.loading}
            value={portfolio} onChange={setPortfolio} label="Review portfolio"
            helperText={`Search all ${companies.data?.total ?? "recorded"} companies. Select up to 10; their recorded two-generation scopes are combined and deduplicated. Empty = entire snapshot.`} />
          {companies.error && <Alert severity="error" action={<Button onClick={companies.reload}>Retry</Button>}>{companies.error}</Alert>}
      {loading && <CircularProgress aria-label="Loading management overview" />}
      {data && (
        <>
          {data.snapshotAgeDays > 30 && (
            <Alert severity="warning">
              Snapshot is {data.snapshotAgeDays} days old. Refresh before
              relying on renewal priorities.
            </Alert>
          )}
          <Grid container spacing={2}>
            {[
              ["Entities in scope", data.total.toLocaleString(), "Unique legal entities after current filters"],
              ["Countries / territories", data.overview?.countries ?? 0, "Legal address coverage"],
              ["Connected to recorded parent", data.overview?.connectedParents ?? 0, "Published direct-parent links within the snapshot"],
              ["Assigned reviews", data.overview?.assignedReviews ?? 0, "Entities with a recorded assessment or active task"],
            ].map(([label, value, help]) => <Grid item xs={12} sm={6} md={3} key={label}>
              <Card sx={{ p: 2, height: "100%" }}><Typography color="text.secondary">{label}</Typography>
                <Typography variant="h3">{value}</Typography><Typography variant="body2" color="text.secondary">{help}</Typography>
              </Card></Grid>)}
          </Grid>
          <Typography variant="h6">Public record maintenance · {data.total.toLocaleString()} entities in scope</Typography>
          <Grid container spacing={2}>
            {[
              [
                "Renewal date passed",
                data.summary.overdueRenewals,
                "renewal=overdue&sort=renewal",
                "Active entities whose published next-renewal date has passed.",
              ],
              [
                "Due within 30 days",
                data.summary.due30,
                "renewal=due-30&sort=renewal",
                "Upcoming LEI renewals, excluding overdue records.",
              ],
              [
                "Due within 90 days",
                data.summary.due90,
                "renewal=due-90&sort=renewal",
                "Includes the next 30 days; do not add these two counts.",
              ],
              [
                "Renewal date unavailable",
                data.summary.unknownRenewals,
                "renewal=unknown",
                "Active entities requiring date verification.",
              ],
            ].map(([label, value, filter, help]) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Card sx={{ p: 2, height: "100%" }}>
                  <Typography>{label}</Typography>
                  <Typography variant="h3">{value}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {help}
                  </Typography>
                  <Link href={drill(String(filter))}>View records →</Link>
                </Card>
              </Grid>
            ))}
          </Grid>
          <ManagementCharts data={data} scope={scope.toString()} />
          {data.metadata.changes && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6">
                What changed in the latest material import?
              </Typography>
              <Typography my={1}>
                {data.metadata.changes.added} entered scope ·{" "}
                {data.metadata.changes.changed} business records changed ·{" "}
                {data.metadata.changes.removed} left scope
              </Typography>
              <Typography color="text.secondary">
                {data.metadata.changes.initial
                  ? "Initial baseline only; these are not newly incorporated companies."
                  : `Compared snapshots ${data.metadata.changes.previousFetchedAt} → ${data.metadata.changes.currentFetchedAt}. Scope changes can add or remove records without any corporate event.`}
              </Typography>
              <Link href="/changes">Inspect changes and source fields →</Link>
            </Card>
          )}
          {!!data.orphanedReviews.length && (
            <Alert severity="warning">
              {data.orphanedReviews.length} review records concern entities
              outside the latest snapshot. Their history is retained.{" "}
              <Link href="/changes">Inspect unresolved scope changes</Link>
            </Alert>
          )}
          <Typography variant="h6">Internal review execution</Typography>
          <Grid container spacing={2}>
            {[
              ["Not assigned", data.summary.unassigned, "workflow=unassigned"],
              [
                "Open / in progress",
                data.summary.openReviews,
                "workflow=active",
              ],
              [
                "Review task overdue",
                data.summary.overdueReviews,
                "workflow=overdue&sort=review-due",
              ],
              ["Evidence changed", data.summary.staleReviews, "workflow=stale"],
              [
                "Reviewed · current evidence",
                data.summary.reviewed,
                "workflow=reviewed",
              ],
            ].map(([label, value, filter]) => (
              <Grid item xs={12} sm={6} md={4} key={label}>
                <Card sx={{ p: 2 }}>
                  <Typography>{label}</Typography>
                  <Typography variant="h4">{value}</Typography>
                  <Link href={drill(String(filter))}>
                    Open review register →
                  </Link>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" color="text.secondary">
            Review completion is an internal assessment, not a change to the
            source record or regulatory approval. Task deadlines use UTC dates.
            Changed evidence requires a fresh assessment; public-data flags remain visible after review. Workload cards overlap: an active task can also be overdue. Do not add these counts together.
          </Typography>
          {!!data.overview?.reviewQueue.length && <Card sx={{ p: 3 }}>
            <Typography variant="h6">Review work queue</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Evidence to re-check first, then overdue tasks and active work. Up to six records in your current scope.</Typography>
            <TableContainer><Table size="small"><TableHead><TableRow>
              {["Entity", "Next action", "Responsible team", "Due (UTC)"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow></TableHead><TableBody>{data.overview.reviewQueue.map((r) => <TableRow key={r.lei}>
              <TableCell><Link href={`/entities/${r.lei}`}>{r.legalName}</Link></TableCell>
              <TableCell>{r.stale ? "Re-check evidence" : r.overdue ? "Follow up overdue task" : r.status === "reviewed" ? "Assessment current" : "Continue review"}</TableCell>
              <TableCell>{r.owner}</TableCell><TableCell>{r.dueDate}</TableCell>
            </TableRow>)}</TableBody></Table></TableContainer>
          </Card>}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Geographic coordination · legal address
            </Typography>
            <Grid container spacing={2}>
              {data.distribution.slice(0, 12).map((d) => (
                <Grid item xs={6} md={3} key={d.country}>
                  <Link href={drill(`country=${d.country}`)}>
                    {countryName(d.country)} · {d.count}
                  </Link>
                  <LinearProgress
                    variant="determinate"
                    value={data.total ? (d.count / data.total) * 100 : 0}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption">
              Top 12 by entity count. This measures record coverage, not
              revenue, assets, or financial exposure.
            </Typography>
          </Card>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Coverage & provenance</Typography>
            <Typography>
              Retrieved {new Date(data.metadata.fetchedAt).toLocaleString()} ·{" "}
              {data.snapshotAgeDays} days old
            </Typography>
            <Typography color="text.secondary" my={1}>
              {data.metadata.scope}
            </Typography>
            {!!data.metadata.supplementalBatches?.length && <Typography color="text.secondary">
              Reference records supplemented {new Date(data.metadata.supplementalBatches.at(-1)!.fetchedAt).toLocaleString()}.
              The base cohort keeps its original retrieval date; entity details show their own retrieval date.
            </Typography>}
            {data.metadata.cohorts?.map((c) => (
              <Typography key={c.country}>
                {countryName(c.country)} reference cohort ({new Date(c.fetchedAt ?? data.metadata.fetchedAt).toLocaleDateString()}): {c.returned}{" "}
                collected / {c.availableAtSource} matching source records.{" "}
                {c.truncated
                  ? "Bounded sample, sorted by LEI; not representative of the market."
                  : "All matching records collected at retrieval."}
              </Typography>
            ))}
            <Typography variant="caption">
              Hash: {data.metadata.contentHash.slice(0, 16)}… · Public reference
              data: CC0 · Source publication:{" "}
              {data.metadata.sourcePublishDates.join(", ")}
            </Typography>
          </Card>
        </>
      )}
    </Stack>
  );
}
