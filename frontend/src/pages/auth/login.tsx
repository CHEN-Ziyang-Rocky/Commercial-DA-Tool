import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Login failed');
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: 'radial-gradient(circle at 50% 0,#09131d 0%,#000 60%)' }}
    >
      <Paper
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          width: 380,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          {/* Logo */}
          <Typography variant="h5" fontWeight={700}>
            <span style={{ color: '#00c6ff' }}>😇</span> My Web
          </Typography>

          <Typography variant="h4">Sign in</Typography>

          <TextField
            label="Email"
            type="email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={Boolean(err)}
            helperText={err}
          />

          <FormControlLabel control={<Checkbox />} label="Remember me" />

          <Button variant="contained" type="submit" fullWidth>
            Sign in
          </Button>

          <Typography variant="body2" align="center">
            Forgot your password?
          </Typography>

          <Typography variant="body2" align="center">
            — or —
          </Typography>

          <Button
            startIcon={<GoogleIcon />}
            fullWidth
            sx={{ bgcolor: 'background.default' }}
          >
            Sign in with Google
          </Button>
          <Button
            startIcon={<FacebookIcon />}
            fullWidth
            sx={{ bgcolor: 'background.default' }}
          >
            Sign in with Facebook
          </Button>

          <Typography variant="body2" align="center">
            Don&apos;t have an account? <b>Sign up</b>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
