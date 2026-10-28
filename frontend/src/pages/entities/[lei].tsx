import ReviewPanel from "@/components/ReviewPanel";
import {
  Alert,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useApiData } from "@/lib/useApiData";
import { countryName, Evidence, RegistryDetail } from "@/lib/registry-types";
function evidenceLabel(e: Evidence) {
  if (e.kind === "not-fetched")
    return "Parent context record: its relationships were not fetched.";
  if (e.kind === "unavailable")
    return "No parent evidence endpoint was supplied by the source.";
  if (e.kind === "exception" && e.record && !Array.isArray(e.record))
    return `Reported exception: ${String(e.record.attributes?.reason ?? "See source")}. This is not proof of no parent.`;
  if (e.record && !Array.isArray(e.record))
    return `Relationship: ${e.record.attributes?.relationship?.status ?? "Unknown"} · registration: ${e.record.attributes?.registration?.status ?? "Unknown"}`;
  return "See source evidence.";
}
export default function EntityDetail() {
  const router = useRouter();
  const lei = typeof router.query.lei === "string" ? router.query.lei : "";
  const from = typeof router.query.from === "string" ? router.query.from : "";
  const entityLink = (id: string) => ({
    pathname: `/entities/${id}`,
    query: from ? { from } : undefined,
  });
  const { data, loading, error, reload } = useApiData<RegistryDetail>(
    lei ? `/registry/${encodeURIComponent(lei)}` : null,
  );
  if (loading || !router.isReady)
    return <CircularProgress aria-label="Loading entity" />;
  if (error)
    return (
      <Alert severity="error" action={<Button onClick={reload}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!data) return null;
  const r = data.record;
  return (
    <Stack spacing={3}>
      <Link href={from ? `/entities?${from}` : "/entities"}>
        ← Entity review
      </Link>
      <div>
        <Typography variant="h4">{r.legalName}</Typography>
        <Typography color="text.secondary" sx={{ fontFamily: "monospace" }}>
          {r.lei}
        </Typography>
      </div>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={r.entityStatus} />
        <Chip label={`LEI: ${r.registrationStatus}`} />
        {data.reviewFlags.map((f) => (
          <Chip key={f} label={f} color="warning" />
        ))}
      </Stack>
      <Button component={Link} href={`/entities?root=${r.lei}`}>
        Review this entity and two child generations
      </Button>
      <ReviewPanel
        evidenceVersion={data.evidenceVersion}
        lei={r.lei}
        review={data.review}
        stale={data.reviewStale}
        reload={reload}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" mb={2}>
              Entity reference
            </Typography>
            {[
              ["Legal address", `${r.city}, ${countryName(r.country)}`],
              ["Legal jurisdiction", r.jurisdiction ?? "Not supplied"],
              ["Entity category", r.category ?? "Not supplied"],
              [
                "Former / other names",
                r.otherNames.join(" · ") || "None supplied",
              ],
              ["Source last updated", r.lastUpdate],
              ["Next LEI renewal", r.nextRenewal ?? "Not supplied"],
              ["Entity retrieved", r.retrievedAt ?? data.metadata.fetchedAt],
            ].map(([label, value]) => (
              <div key={label}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography mb={1} sx={{ overflowWrap: "anywhere" }}>
                  {value}
                </Typography>
              </div>
            ))}
            <a href={r.sourceUrl} target="_blank" rel="noreferrer">
              Open original GLEIF entity record ↗
            </a>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" mb={2}>
              Accounting consolidation parents
            </Typography>
            {(["direct", "ultimate"] as const).map((kind) => {
              const parent =
                kind === "direct" ? data.directParent : data.ultimateParent;
              const evidence = r.parents[kind];
              return (
                <Stack spacing={1} mb={3} key={kind}>
                  <Typography fontWeight={600}>
                    {kind === "direct" ? "Direct parent" : "Ultimate parent"}
                  </Typography>
                  {parent ? (
                    <Link href={entityLink(parent.lei)}>
                      {parent.legalName}
                    </Link>
                  ) : (
                    <Typography>
                      No active published parent resolved in this snapshot.
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {evidenceLabel(evidence)}
                  </Typography>
                  {evidence.sourceUrl && (
                    <a
                      href={evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View relationship / exception evidence ↗
                    </a>
                  )}
                </Stack>
              );
            })}
          </Card>
        </Grid>
      </Grid>
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          Published direct-parent chain in this snapshot
        </Typography>
        <Stack spacing={1}>
          <Typography>{r.legalName}</Typography>
          {data.ancestors.map((a, i) => (
            <Typography key={a.lei} sx={{ pl: Math.min(i + 1, 5) * 2 }}>
              ↳ <Link href={entityLink(a.lei)}>{a.legalName}</Link>
            </Typography>
          ))}
        </Stack>
        <Alert severity="info" sx={{ mt: 2 }}>
          {data.stopReason}. No inference of ultimate ownership is made from a
          stopped chain.
        </Alert>
      </Card>
      <Card sx={{ p: 3 }}>
        <Typography variant="h6">
          Direct children · active, published relationships
        </Typography>
        <Typography color="text.secondary" mb={2}>
          {data.children.length} resolved in this snapshot.{" "}
          {data.coverage
            ? `Source direct-children endpoint returned ${data.coverage.reportedDirectChildren} records when collected; non-published relationships are excluded from the tree.`
            : "The complete child list was not fetched for this entity."}
        </Typography>
        <Stack spacing={1}>
          {data.children.map((c) => (
            <div key={c.lei}>
              <Link href={entityLink(c.lei)}>{c.legalName}</Link>
              <Typography variant="caption" ml={1}>
                {countryName(c.country)} · {c.registrationStatus}
              </Typography>
            </div>
          ))}
        </Stack>
        {!data.children.length && (
          <Alert severity="info">
            No qualifying child relationship in the collected scope. This does
            not establish that the entity has no subsidiaries.
          </Alert>
        )}
      </Card>
      <Alert severity="warning">
        This is a public-data review aid, not a complete ownership register, a
        KYC decision, or consolidated financial reporting. LEI LAPSED describes
        registration maintenance; it does not mean bankruptcy. Revenue,
        employees and ownership percentages are not supplied here.
      </Alert>
    </Stack>
  );
}
