import {
  Alert,
  Button,
  Card,
  CircularProgress,
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
import { useState } from "react";
import { useApiData } from "@/lib/useApiData";
import { RegistryChanges } from "@/lib/registry-types";
export default function Changes() {
  const { data, loading, error, reload } =
    useApiData<RegistryChanges>("/registry/changes");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(0);
  const changes = data?.changes;
  const entries =
    changes?.entries.filter((e) => kind === "all" || e.kind === kind) ?? [];
  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        Source change review
      </Typography>
      <Typography color="text.secondary">
        Compare successive imported snapshots to find changes to names, status,
        renewal dates and published parents.
      </Typography>
      {loading && <CircularProgress />}
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={reload}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
      {data && (
        <>
          <Alert severity="info">
            Entered / left scope describes this collected dataset, not
            incorporations, acquisitions or closures. Field comparisons do not
            establish why a change occurred.
          </Alert>
          {!changes ? (
            <Alert severity="info">
              No comparison has been recorded. Import a snapshot to establish a
              baseline.
            </Alert>
          ) : (
            <>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6">
                  {changes.initial
                    ? "Initial baseline"
                    : "Latest material comparison"}
                </Typography>
                <Typography>
                  {changes.previousFetchedAt ?? "No earlier snapshot"} →{" "}
                  {changes.currentFetchedAt}
                </Typography>
                <Typography>
                  {changes.added} entered · {changes.changed} changed ·{" "}
                  {changes.removed} left
                </Typography>
              </Card>
              <TextField
                select
                label="Change type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setPage(0);
                }}
              >
                {[
                  ["all", "All changes"],
                  ["changed", "Business fields changed"],
                  ["added", "Entered scope"],
                  ["removed", "Left scope"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {["Entity", "Change", "Before → after"].map((h) => (
                          <TableCell key={h}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.slice(page * 20, page * 20 + 20).map((e) => (
                        <TableRow key={e.lei}>
                          <TableCell>
                            {e.kind === "removed" ? (
                              e.legalName
                            ) : (
                              <Link href={`/entities/${e.lei}`}>
                                {e.legalName}
                              </Link>
                            )}
                            <Typography variant="caption" display="block">
                              {e.lei}
                            </Typography>
                          </TableCell>
                          <TableCell>{e.kind}</TableCell>
                          <TableCell>
                            {e.fields.map((f) => (
                              <Typography
                                key={f.field}
                                variant="body2"
                                sx={{ overflowWrap: "anywhere" }}
                              >
                                {f.field}: {f.before || "Not supplied"} →{" "}
                                {f.after || "Not supplied"}
                              </Typography>
                            ))}
                            {!e.fields.length && "Scope membership only"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {!entries.length && (
                  <Alert severity="info">No changes of this type.</Alert>
                )}
                <TablePagination
                  component="div"
                  count={entries.length}
                  page={page}
                  rowsPerPage={20}
                  rowsPerPageOptions={[20]}
                  onPageChange={(_, v) => setPage(v)}
                />
              </Card>
            </>
          )}
          {!!data.orphanedReviews.length && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6">
                Reviews retained outside current scope
              </Typography>
              {data.orphanedReviews.map((r) => (
                <Typography key={r.lei}>
                  {r.lei} · {r.owner} · {r.status} · due {r.dueDate}
                </Typography>
              ))}
              <Typography variant="caption">
                Do not silently close these reviews. Restore or verify the
                source scope before further assessment.
              </Typography>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
