import {
  Alert,
  Autocomplete,
  Button,
  Card,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api, { errorMessage } from "@/lib/api";
import { ReviewState } from "@/lib/registry-types";
export default function ReviewPanel({
  lei,
  evidenceVersion,
  review,
  stale,
  reload,
}: {
  lei: string;
  evidenceVersion: string;
  review: ReviewState | null;
  stale: boolean;
  reload: () => void;
}) {
  const { user } = useAuth();
  const [owners, setOwners] = useState<string[]>([
    "Entity operations",
    "Finance control",
    "Legal / company secretariat",
    "Data governance",
  ]);
  useEffect(() => {
    if (user?.role === "admin") {
      api
        .get("/user?limit=100")
        .then((r) =>
          setOwners((previous) => [
            ...new Set([
              ...previous,
              ...r.data.items.map((u: { fullName: string }) => u.fullName),
            ]),
          ]),
        )
        .catch(() => {});
    }
  }, [user?.role]);
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setStatus(review?.status ?? "open");
    setOwner(review?.owner ?? "");
    setDueDate(review?.dueDate ?? "");
    setNote("");
    setError("");
  }, [lei, review]);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/registry/${lei}/review`, {
        version: review?.version ?? 0,
        evidenceVersion,
        status,
        owner,
        dueDate,
        note,
      });
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Internal evidence review</Typography>
        <Typography color="text.secondary">
          Assign an owner, set a deadline, and record the evidence checked and
          next action. Reviewed means a documented assessment; it does not
          remove source warnings.
        </Typography>
        {stale && (
          <Alert severity="warning">
            The assessment evidence version differs from the current record. Re-check current evidence before marking this record reviewed.
          </Alert>
        )}
        {error && (
          <Alert severity="error">
            {error} <Button onClick={reload}>Reload latest</Button>
          </Alert>
        )}
        {user?.role === "admin" ? (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Autocomplete
                fullWidth
                options={[...new Set([...owners, ...(owner ? [owner] : [])])]}
                value={owner || null}
                onChange={(_, v) => setOwner(v ?? "")}
                renderInput={(p) => (
                  <TextField {...p} label="Responsible person / team" />
                )}
              />
              <TextField
                fullWidth
                type="date"
                label="Review due date (UTC)"
                InputLabelProps={{ shrink: true }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <TextField
                select
                fullWidth
                label="Review status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  ["open", "Open"],
                  ["in_progress", "In progress"],
                  ["reviewed", "Reviewed"],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  variant="outlined"
                  onClick={() =>
                    setDueDate(
                      new Date(Date.now() + days * 86400000)
                        .toISOString()
                        .slice(0, 10),
                    )
                  }
                >
                  Due in {days} days
                </Button>
              ))}
              <Button
                onClick={() => {
                  setStatus("in_progress");
                  setNote(
                    "Next action: verify the published renewal date and contact the entity record owner for an update.",
                  );
                }}
              >
                Prepare renewal follow-up
              </Button>
              <Button
                onClick={() => {
                  setStatus("in_progress");
                  setNote(
                    "Next action: compare direct and ultimate parent evidence with the internal entity register; document any discrepancy.",
                  );
                }}
              >
                Prepare relationship check
              </Button>
            </Stack>
            <TextField
              label="Evidence checked, conclusion and next action"
              multiline
              minRows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              helperText="At least 10 characters. Every save appends an audit entry; previous notes are retained."
              inputProps={{ maxLength: 2000 }}
            />
            <Button
              variant="contained"
              disabled={
                saving || !owner.trim() || !dueDate || note.trim().length < 10
              }
              onClick={save}
            >
              {saving ? "Saving…" : "Save assessment"}
            </Button>
          </>
        ) : (
          <Alert severity="info">
            Read-only access. An administrator records and assigns reviews.
          </Alert>
        )}
        <Typography fontWeight={600}>
          Audit history · {review?.history.length ?? 0} entries
        </Typography>
        {!review && (
          <Typography>No review has been recorded for this entity.</Typography>
        )}
        {[...(review?.history ?? [])].reverse().map((h) => (
          <Card variant="outlined" key={h.version} sx={{ p: 2 }}>
            <Typography>
              {h.status} · {h.owner} · due {h.dueDate}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {h.note}
            </Typography>
            <Typography variant="caption">
              {h.at} · {h.actor === "workflow-initializer" ? "Workflow initialization" : `user ID ${h.actor}`} · revision {h.version}
            </Typography>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
