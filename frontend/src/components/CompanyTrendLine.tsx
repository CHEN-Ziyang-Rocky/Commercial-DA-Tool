import { Card, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const companies = [2000, 1500, 1600, 1800, 1500, 2200, 3000, 2500, 2600, 3500, 2800, 3200];
const visitors = [800, 600, 500, 700, 800, 900, 1000, 850, 950, 1100, 1050, 1200]; // 演示另一条虚线

export default function CompanyTrendLine() {
  return (
    <Card sx={{ p: 2 }} elevation={0}>
      <Typography variant="h6" mb={2}>
        Total Revenue
      </Typography>

      <LineChart
        height={350}
        xAxis={[{ scaleType: 'point', data: months }]}
        series={[
          {
            id: 'sales',
            label: 'Sales ($)',
            data: companies,
            color: '#1976d2',
            showMark: false,
            area: false,
            curve: 'monotone',
            highlightScope: { faded: 'global', highlighted: 'item' },
          },
          {
            id: 'visitors',
            label: 'Visitors',
            data: visitors,
            color: '#9e9e9e',
            showMark: true,
            area: false,
            curve: 'monotone',
            dash: [4, 4],
          },
        ]}
        margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
        sx={{
          '.MuiLineElement-root': { strokeWidth: 2 },
          '.MuiMarkElement-root': { strokeWidth: 0 },
        }}
      />
    </Card>
  );
}
