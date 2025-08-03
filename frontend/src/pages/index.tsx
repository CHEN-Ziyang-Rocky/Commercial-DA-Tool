import { Grid, Stack } from '@mui/material';
import StatCard from '../components/StatCard';
import CompanyLevelDonut from '../components/CompanyLevelDonut';
import CompanyTrendLine from '../components/CompanyTrendLine';

export default function DashboardHome() {
  return (
    <Stack spacing={3}>
      {/* 顶部 4 张数据卡 */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Company Count" value="2 532" helper="+26% since last month" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Revenue" value="$24 300" helper="+18% since last month" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Countries Covered" value="42" helper="+9 new" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Employees" value="170 212" helper="+14% since last month" />
        </Grid>
      </Grid>

      {/* 下方图表区域 */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <CompanyTrendLine />
        </Grid>
        <Grid item xs={12} md={4}>
          <CompanyLevelDonut />
        </Grid>
      </Grid>
    </Stack>
  );
}
