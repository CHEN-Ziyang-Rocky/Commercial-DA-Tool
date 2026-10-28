import { WorkspaceHelp } from "@/components/WorkspaceHelp";
import { CompanyPicker } from "@/components/CompanyPicker";
import { PublicAggregation } from "@/components/PublicAggregation";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useApiData } from "@/lib/useApiData";
import api, { errorMessage } from "@/lib/api";
import { countryName, RegistryList, CompanyOption } from "@/lib/registry-types";

export default function EntityWorkspace() {
  const router = useRouter();
  const [root, setRoot] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [registration, setRegistration] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [group, setGroup] = useState(""); // Legacy shared links retain their original seed-membership filter.
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const companyData = useApiData<{ total: number; items: CompanyOption[] }>("/registry/company-options");
  const [quality, setQuality] = useState("all");
  const [status, setStatus] = useState("all");
  const [renewal, setRenewal] = useState("all");
  const [sort, setSort] = useState("name");
  const [workflow, setWorkflow] = useState("all");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [options, setOptions] = useState<RegistryList["options"]>({
    cities: [],
    registrationStatuses: [],
    countries: [],
    groups: [],
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (!router.isReady || restored) return;
    const value = router.query;
    const text = (k: string) =>
      typeof value[k] === "string" ? (value[k] as string) : "";
    const many = (key: string): string[] =>
      typeof value[key] === "string"
        ? [value[key] as string]
        : ((value[key] as string[]) ?? []);
    setRoot(text("root"));
    setLevels(many("hierarchyLevel"));
    setCities(many("city"));
    setRegistration(many("registrationStatus"));
    setQ(text("q"));
    setSearch(text("q"));
    setGroup(text("group"));
    setPortfolio(many("portfolio"));
    setQuality(text("quality") || "all");
    setStatus(text("status") || "all");
    setRenewal(text("renewal") || "all");
    setWorkflow(text("workflow") || "all");
    setSort(text("sort") || "name");
    setCountries(
      typeof value.country === "string"
        ? [value.country]
        : (value.country ?? []),
    );
    const requestedPage = Number(text("page"));
    const requestedLimit = Number(text("limit"));
    setPage(
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage - 1
        : 0,
    );
    setLimit([10, 20, 50, 100].includes(requestedLimit) ? requestedLimit : 20);
    setRestored(true);
  }, [router.isReady, router.query, restored]);
  useEffect(() => {
    if (!restored || q === search) return;
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, search, restored]);
  const params = new URLSearchParams({
    q: search,
    page: String(page + 1),
    limit: String(limit),
    quality,
    status,
    renewal,
    workflow,
    sort,
  });
  countries.forEach((c) => params.append("country", c));
  if (root) params.set("root", root);
  levels.forEach((v) => params.append("hierarchyLevel", v));
  cities.forEach((v) => params.append("city", v));
  registration.forEach((v) => params.append("registrationStatus", v));
  if (group) params.set("group", group);
  portfolio.forEach((v) => params.append("portfolio", v));
  const { data, loading, error, reload } = useApiData<RegistryList>(
    restored ? `/registry?${params}` : null,
  );
  useEffect(() => {
    if (data) setOptions(data.options);
  }, [data]);
  const reset = () => {
    setRoot("");
    setLevels([]);
    setCities([]);
    setRegistration([]);
    setQ("");
    setSearch("");
    setCountries([]);
    setGroup("");
    setPortfolio([]);
    setQuality("all");
    setStatus("all");
    setRenewal("all");
    setWorkflow("all");
    setSort("name");
    setPage(0);
  };
  const preset = (name: string) => {
    reset();
    if (name === "hk") setCountries(["HK"]);
    if (name === "review") setQuality("review");
    if (name === "lapsed") setQuality("lapsed");
  };
  const share = async () => {
    const url = `${window.location.origin}/entities?${params}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("View link copied. Recipients must sign in.");
    } catch {
      setShareMessage("Copy the view link below. Recipients must sign in.");
    }
  };
  const download = async () => {
    setExporting(true);
    setExportError("");
    try {
      const result = await api.get(`/registry/export?${params}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(result.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "entity-review.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          PUBLIC ENTITY INTELLIGENCE · GLEIF
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          Entities & review register
        </Typography>
        <Typography color="text.secondary" mt={1}>
          Find legal entities, inspect reported consolidation relationships and
          assign and track evidence reviews.
        </Typography>
      </Box>
      <Alert severity="info">
        Public reference data, not internal company accounts. Relationships
        describe accounting consolidation, not ownership percentages. Missing
        relationships do not mean no subsidiaries. This workspace is independent
        of GLEIF.
      </Alert>
      <WorkspaceHelp />
      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {[
              ["all", "All entities"],
              ["hk", "Hong Kong legal address"],
              ["review", "Needs data review"],
              ["lapsed", "Lapsed LEIs"],
            ].map(([key, label]) => (
              <Button key={key} variant="outlined" onClick={() => preset(key)}>
                {label}
              </Button>
            ))}
          </Stack>
          {companyData.error && <Alert severity="error" action={<Button onClick={companyData.reload}>Retry</Button>}>{companyData.error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Search all {companyData.data?.total ?? "recorded"} entities by legal name, alias or LEI.
            Recently used companies appear first, followed by the full A–Z list. Type to search every recorded company.
          </Typography>
          {group && <Alert severity="info" action={<Button onClick={() => { setGroup(""); setPage(0); }}>Clear legacy scope</Button>}>
            This saved link uses the original seed portfolio: {group}. Choose companies below to replace it with a combined review scope.
          </Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <CompanyPicker options={companyData.data?.items ?? []} loading={companyData.loading}
                value={root} label="Hierarchy root"
                helperText="One starting entity keeps levels unambiguous: root → child → grandchild. Search every recorded company."
                onChange={(lei) => { setRoot(lei); setLevels([]); setPage(0); }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                disabled={!root}
                options={["1", "2", "3"]}
                value={levels}
                onChange={(_, v) => {
                  setLevels(v);
                  setPage(0);
                }}
                renderInput={(p) => (
                  <TextField {...p} label="Relative hierarchy levels" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={options.cities}
                value={cities}
                onChange={(_, v) => {
                  setCities(v);
                  setPage(0);
                }}
                renderInput={(p) => <TextField {...p} label="City" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={options.registrationStatuses}
                value={registration}
                onChange={(_, v) => {
                  setRegistration(v);
                  setPage(0);
                }}
                renderInput={(p) => (
                  <TextField {...p} label="LEI registration status" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search legal name, former name or LEI"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                inputProps={{ maxLength: 120 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <CompanyPicker multiple options={companyData.data?.items ?? []} loading={companyData.loading}
                value={portfolio} label="Review portfolio"
                helperText="Up to 10 companies + two recorded generations each. Overlaps count once. Other filters narrow this combined scope."
                onChange={(leis) => { setPortfolio(leis); setGroup(""); setPage(0); }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={options.countries}
                getOptionLabel={(c) => `${countryName(c)} (${c})`}
                value={countries}
                onChange={(_, v) => {
                  setCountries(v);
                  setCities([]);
                  setPage(0);
                }}
                renderInput={(p) => (
                  <TextField {...p} label="Legal address country / territory" />
                )}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                select
                label="Entity status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                {[
                  ["all", "All"],
                  ["ACTIVE", "Active"],
                  ["INACTIVE", "Inactive"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                select
                label="Data review"
                value={quality}
                onChange={(e) => {
                  setQuality(e.target.value);
                  setPage(0);
                }}
              >
                {[
                  ["all", "All"],
                  ["review", "Needs review"],
                  ["lapsed", "Lapsed LEI"],
                  ["missing-parent", "No published direct parent"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="LEI renewal"
                value={renewal}
                onChange={(e) => {
                  setRenewal(e.target.value);
                  setPage(0);
                }}
              >
                {[
                  ["all", "All renewal dates"],
                  ["overdue", "Renewal date passed"],
                  ["due-30", "Due in next 30 days"],
                  ["due-90", "Due in next 90 days"],
                  ["unknown", "Active entity, date missing"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Internal review workflow"
                value={workflow}
                onChange={(e) => {
                  setWorkflow(e.target.value);
                  setPage(0);
                }}
              >
                {[
                  ["all", "All reviews"],
                  ["unassigned", "Not assigned"],
                  ["active", "Open or in progress"],
                  ["open", "Open"],
                  ["in_progress", "In progress"],
                  ["reviewed", "Reviewed against current evidence"],
                  ["overdue", "Review task overdue"],
                  ["stale", "Evidence changed since review"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <TextField
            select
            label="Sort records"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="name">Legal name A–Z</MenuItem>
            <MenuItem value="renewal">Earliest renewal first</MenuItem>
            <MenuItem value="review-due">
              Earliest open review deadline first
            </MenuItem>
          </TextField>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button disabled={loading || q !== search} onClick={share}>
              Copy view link
            </Button>
            <Button onClick={reset}>Clear filters</Button>
            <Button
              variant="contained"
              disabled={loading || exporting || q !== search || !data?.total}
              onClick={download}
            >
              {exporting
                ? "Exporting…"
                : `Export all ${data?.total ?? 0} matches`}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Filters combine with AND; countries combine with OR. Review flags
            concern data maintenance, not creditworthiness or regulatory
            approval.
          </Typography>
        </Stack>
      </Card>
      <PublicAggregation
        query={params.toString()}
        enabled={restored && !search && quality === "all" && workflow === "all"}
      />
      {shareMessage && (
        <Alert severity="success" onClose={() => setShareMessage("")}>
          {shareMessage}
          <TextField
            fullWidth
            size="small"
            value={shareUrl}
            label="View link"
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
        </Alert>
      )}
      {exportError && <Alert severity="error">{exportError}</Alert>}
      {loading ? (
        <CircularProgress aria-label="Loading entities" />
      ) : error ? (
        <Alert
          severity="error"
          action={<Button onClick={reload}>Retry</Button>}
        >
          {error}
        </Alert>
      ) : (
        data && (
          <>
            {data.snapshotAgeDays > 30 && (
              <Alert severity="warning">
                This snapshot is {data.snapshotAgeDays} days old. Refresh and
                review the source before operational use.
              </Alert>
            )}
            <Grid container spacing={2}>
              {[
                ["Matching entities", data.summary.entities],
                ["Legal jurisdictions", data.summary.jurisdictions],
                ["Needs data review", data.summary.review],
                ["Parent reporting exceptions", data.summary.parentExceptions],
              ].map(([label, value]) => (
                <Grid item xs={6} md={3} key={label}>
                  <Card sx={{ p: 2 }}>
                    <Typography color="text.secondary">{label}</Typography>
                    <Typography variant="h4">{value}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Card sx={{ p: 2 }}>
              <Typography fontWeight={600} mb={2}>
                Legal address distribution · current selection
              </Typography>
              <Grid container spacing={2}>
                {data.distribution.slice(0, 8).map((row) => (
                  <Grid item xs={6} md={3} key={row.country}>
                    <Typography variant="body2">
                      {countryName(row.country)} · {row.count}
                    </Typography>
                    <LinearProgress
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      variant="determinate"
                      value={(row.count / data.total) * 100}
                    />
                  </Grid>
                ))}
              </Grid>
              {data.distribution.length > 8 && (
                <Typography variant="caption">
                  Top 8 of {data.distribution.length} countries / territories
                  shown.
                </Typography>
              )}
            </Card>
            <Card>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        "Legal entity",
                        "Legal address",
                        "Entity / LEI status",
                        "Parent evidence",
                        "Renewal / internal review",
                        "Data checks",
                      ].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((r) => (
                      <TableRow key={r.lei} hover>
                        <TableCell>
                          <Link
                            href={{
                              pathname: `/entities/${r.lei}`,
                              query: { from: params.toString() },
                            }}
                          >
                            {r.legalName}
                          </Link>
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {r.lei}
                            {r.hierarchyLevel
                              ? ` · Level ${r.hierarchyLevel}`
                              : ""}
                          </Typography>
                          {r.contextOnly && (
                            <Chip size="small" label="Parent context only" />
                          )}
                        </TableCell>
                        <TableCell>
                          {countryName(r.country)}
                          <Typography variant="caption" display="block">
                            {r.city}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.entityStatus}
                          <Typography variant="caption" display="block">
                            LEI: {r.registrationStatus}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.parents.direct.kind === "exception"
                            ? "Reporting exception"
                            : r.parents.direct.kind === "relationship"
                              ? "Reported relationship"
                              : "Outside coverage"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {r.nextRenewal?.slice(0, 10) ?? "Date unavailable"}{" "}
                            · {r.renewal}
                          </Typography>
                          <Typography variant="caption">
                            {r.review
                              ? `${r.review.status} · ${r.review.owner} · due ${r.review.dueDate}`
                              : "Not assigned"}
                          </Typography>
                          {r.reviewStale && (
                            <Chip
                              size="small"
                              color="warning"
                              label="Evidence changed"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {r.reviewFlags?.length ? (
                            <Chip
                              size="small"
                              color="warning"
                              label={`${r.reviewFlags.length} check(s)`}
                            />
                          ) : (
                            <Typography variant="body2">
                              No configured flags
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {!data.total && (
                <Alert severity="info">
                  No matching entities. Clear a filter or try a former name /
                  LEI.
                </Alert>
              )}
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                rowsPerPage={limit}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={(_, v) => setPage(v)}
                onRowsPerPageChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0);
                }}
              />
            </Card>
            <Typography variant="body2" color="text.secondary">
              Snapshot retrieved:{" "}
              {new Date(data.metadata.fetchedAt).toLocaleString()} · CC0
              reference data. {data.metadata.scope} Counts refer only to this
              snapshot.{" "}
              <a
                href="https://www.gleif.org/en/meta/lei-data-terms-of-use"
                target="_blank"
                rel="noreferrer"
              >
                Source terms
              </a>
            </Typography>
          </>
        )
      )}
    </Stack>
  );
}
