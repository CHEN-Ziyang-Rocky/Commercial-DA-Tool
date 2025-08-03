import { Card, Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string | number;
  helper?: string;
}

export default function StatCard({ label, value, helper }: Props) {
  return (
    <Card
      sx={{
        px: 3,
        py: 2,
        flex: 1,
        bgcolor: 'background.paper',
      }}
      elevation={0}
    >
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
        {helper && (
          <Typography variant="caption" color="success.main">
            {helper}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
