import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
} from "@mui/material";
import { useState } from "react";
import api, { errorMessage } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Page } from "@/lib/types";
const empty = {
  fullName: "",
  email: "",
  phone: "",
  role: "user" as "user" | "admin",
  password: "",
};
export default function UserTable() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useApiData<Page<User>>(
    user?.role === "admin" ? `/user?page=${page + 1}&limit=20` : null,
  );
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<User>();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const startEdit = async (row: User | null) => {
    if (row) {
      try {
        row = (await api.get<User>(`/user/${row.id}`)).data;
      } catch (err) {
        setMutationError(errorMessage(err));
        return;
      }
    }
    setForm(
      row
        ? {
            fullName: row.fullName,
            email: row.email,
            phone: row.phone ?? "",
            role: row.role,
            password: "",
          }
        : empty,
    );
    setMutationError("");
    setEditing(row);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMutationError("");
    const payload = {
      fullName: form.fullName,
      email: form.email,
      role: form.role,
      phone: form.phone,
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (editing) await api.patch(`/user/${editing.id}`, payload);
      else await api.post("/user", payload);
      setEditing(undefined);
      reload();
    } catch (err) {
      setMutationError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setMutationError("");
    try {
      await api.delete(`/user/${deleting.id}`);
      setDeleting(undefined);
      if (data?.items.length === 1 && page > 0) setPage(page - 1);
      else reload();
    } catch (err) {
      setMutationError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  if (user?.role !== "admin")
    return <Alert severity="warning">Administrator access required.</Alert>;
  return (
    <Paper sx={{ p: 2 }}>
      {mutationError && editing === undefined && !deleting && <Alert severity="error">{mutationError}</Alert>}
      <Button
        variant="contained"
        onClick={() => startEdit(null)}
        sx={{ mb: 2 }}
      >
        Create user
      </Button>
      {loading ? (
        <CircularProgress aria-label="Loading users" />
      ) : error ? (
        <Alert
          severity="error"
          action={<Button onClick={reload}>Retry</Button>}
        >
          {error}
        </Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {["Name", "Email", "Phone", "Role", "Actions"].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.fullName}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    <Button onClick={() => startEdit(row)}>Edit</Button>
                    <Button
                      color="error"
                      disabled={row.id === user.sub}
                      onClick={() => {
                        setDeleting(row);
                        setMutationError("");
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {!loading && !error && !data?.items.length && (
        <Alert severity="info">No users available.</Alert>
      )}
      <TablePagination
        component="div"
        count={data?.total ?? -1}
        page={page}
        rowsPerPage={20}
        rowsPerPageOptions={[20]}
        onPageChange={(_, next) => setPage(next)}
      />
      <Dialog
        open={editing !== undefined}
        onClose={() => !busy && setEditing(undefined)}
        fullWidth
      >
        <form onSubmit={save}>
          <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField
                required
                label="Full name"
                value={form.fullName}
                inputProps={{ minLength: 2, maxLength: 120 }}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
              />
              <TextField
                required
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
              <TextField
                label="Phone (optional)"
                value={form.phone}
                inputProps={{ maxLength: 20 }}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <TextField
                select
                label="Role"
                value={form.role}
                disabled={editing?.id === user.sub}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as "admin" | "user",
                  })
                }
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </TextField>
              <TextField
                required={!editing}
                label={
                  editing ? "New password (leave blank to keep)" : "Password"
                }
                type="password"
                autoComplete="new-password"
                value={form.password}
                inputProps={{ minLength: 8, maxLength: 50 }}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              {mutationError && <Alert severity="error">{mutationError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(undefined)}
      >
        <DialogTitle>Delete {deleting?.fullName}?</DialogTitle>
        <DialogContent>
          This account will lose access immediately.
          {mutationError && <Alert severity="error">{mutationError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDeleting(undefined)}>
            Cancel
          </Button>
          <Button disabled={busy} color="error" onClick={remove}>
            Delete account
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
