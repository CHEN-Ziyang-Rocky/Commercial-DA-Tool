// components/CompanyLevelDonut.tsx
import {
  Card,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useEffect, useRef, useState } from 'react';

const data = [
  { id: 0, value: 45, label: 'Level 1', color: '#2196f3' },
  { id: 1, value: 30, label: 'Level 2', color: '#ef5350' },
  { id: 2, value: 25, label: 'Level 3', color: '#ffb300' },
];

export default function CompanyLevelDonut() {
  const total = data.reduce((s, d) => s + d.value, 0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(260); // 初始直径
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  // ResizeObserver：容器变动时自适应
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const desired = mdUp ? w * 0.6 : w * 0.8; // md↑占60%，sm↓占80%
      setSize(Math.max(200, Math.min(desired, 380))); // 200~380 区间
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mdUp]);

  const inner = size * 0.35;
  const outer = size * 0.48;

  return (
    <Card sx={{ p: 2 }} elevation={0} ref={wrapRef}>
      <Typography variant="h6" mb={2}>
        Company Level Distribution
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems="center"
      >
        {/* Doughnut */}
        <Box
          sx={{
            flexBasis: { md: '60%' },
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PieChart
            height={size}
            width={size}
            series={[
              {
                innerRadius: inner,
                outerRadius: outer,
                paddingAngle: 1,
                data,
              },
            ]}
            legend={{ hidden: true }}
          />
          {/* 中心文字 */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >

          </Box>
        </Box>

        {/* Table */}
        <Box
          sx={{
            flexBasis: { md: '40%' },
            overflowX: 'auto',
            minWidth: 160,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Level</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.label}</TableCell>
                  <TableCell align="right">{d.value}</TableCell>
                  <TableCell align="right">
                    {((d.value / total) * 100).toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Card>
  );
}
