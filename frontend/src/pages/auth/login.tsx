import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/api";
export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={2}
    >
      <Paper sx={{ p: 4, width: 400 }}>
        <Stack component="form" spacing={3} onSubmit={submit}>
          <Typography variant="h5">Commercial DA</Typography>
          <Typography variant="h4">Sign in</Typography>
          <TextField
            required
            label="Email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <TextField
            required
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="contained" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Use an account provided by your administrator.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
