import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { startDemo } from '@/lib/demo';
import { errorMessage } from '@/lib/api';
export default function Demo() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <Box p={3} maxWidth={650} mx="auto" mt={6}><Paper sx={{ p: 4 }}><Stack spacing={3}>
    <Typography variant="h4">Explore Commercial DA</Typography>
    <Typography>No registration required. Explore with sample data.</Typography>
    <Typography>Search a bundled GLEIF public snapshot, inspect reported parent relationships, and edit your own temporary evidence reviews. Review tasks are synthetic. This independent portfolio project is not a Bilibili internal system.</Typography>
    <Typography variant="body2">Demo uses a separate context; your normal login is preserved. By default, progress expires after 60 minutes idle or 24 hours, and on service restart.</Typography>
    {error && <Alert severity="error">Demo temporarily unavailable. {error} Retry below or explore the project source.</Alert>}
    <Button variant="contained" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await startDemo(); } catch(e) { setError(errorMessage(e)); sessionStorage.removeItem('portfolio_demo_key'); setBusy(false); } }}>{busy ? 'Preparing demo…' : 'Try Demo'}</Button>
    <Button href="/auth/login">Sign in</Button><Button href="https://github.com/CHEN-Ziyang-Rocky/Commercial-DA-Tool">Project overview & GitHub</Button>
  </Stack></Paper></Box>;
}
