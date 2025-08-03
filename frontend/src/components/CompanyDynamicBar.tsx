import {
  Card,
  Stack,
  Button,
  MenuItem,
  Select,
  TextField,
  Slider,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useState } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
// import axios from 'axios';
import api from '@/lib/api';

type Dimension = 'level' | 'country' | 'city';
interface SearchBody {
  dimension: Dimension;
  filter: {
    level?: number[];
    country?: string[];
    city?: string[];
    founded_year?: { start?: number; end?: number };
    annual_revenue?: { min?: number; max?: number };
    employees?: { min?: number; max?: number };
  };
}

export default function CompanyDynamicBar() {
  /* ------------------------ UI State ------------------------ */
  const [dimension, setDim] = useState<Dimension>('level');
  const [levels, setLevels] = useState<number[]>([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState<[number, number]>([1900, 2025]);
  const [revenue, setRevenue] = useState<[number, number]>([0, 1_000_000]);
  const [employees, setEmp] = useState<[number, number]>([0, 10_000]);
  const [loading, setLoading] = useState(false);

  /* ------------------------ Data State ---------------------- */
  const [chartData, setChart] = useState<{ labels: string[]; counts: number[] }>(
    { labels: [], counts: [] },
  );

  /* ------------------------ Fetch --------------------------- */
  const fetchData = async () => {
    setLoading(true);
    const body: SearchBody = {
      dimension,
      filter: {
        ...(levels.length ? { level: levels } : {}),
        ...(country ? { country: [country] } : {}),
        ...(city ? { city: [city] } : {}),
        founded_year: { start: year[0], end: year[1] },
        annual_revenue: { min: revenue[0], max: revenue[1] },
        employees: { min: employees[0], max: employees[1] },
      },
    };
    try {
      // const { data } = await axios.post('/company/search', body);
      const { data } = await api.post('/company/search', body);
      // 后端返回 { dimension, data: { key: [companyObj,...] } }
      const labels = Object.keys(data.data);
      const counts = labels.map((k) => data.data[k].length);
      setChart({ labels, counts });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------ UI ------------------------------ */
  return (
    <Card sx={{ p: 3 }} elevation={0}>
      <Stack spacing={3}>
        {/* Filters */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Select
              fullWidth
              value={dimension}
              onChange={(e) => setDim(e.target.value as Dimension)}
            >
              <MenuItem value="level">Level</MenuItem>
              <MenuItem value="country">Country</MenuItem>
              <MenuItem value="city">City</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Level (csv)"
              placeholder="1,2,3"
              value={levels.join(',')}
              onChange={(e) =>
                setLevels(
                  e.target.value
                    .split(',')
                    .map((x) => parseInt(x.trim()))
                    .filter(Boolean),
                )
              }
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Grid>

          {/* Range sliders */}
          <Grid item xs={12} sm={6}>
            <Slider
              value={year}
              onChange={(_, v) => setYear(v as [number, number])}
              min={1900}
              max={2025}
              valueLabelDisplay="auto"
              marks={[
                { value: 1900, label: '1900' },
                { value: 2025, label: '2025' },
              ]}
            />
            <Stack direction="row" justifyContent="space-between">
              <small>Founded Year</small>
              <small>
                {year[0]} – {year[1]}
              </small>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Slider
              value={revenue}
              onChange={(_, v) => setRevenue(v as [number, number])}
              min={0}
              max={1_000_000}
              step={10_000}
              valueLabelDisplay="auto"
            />
            <Stack direction="row" justifyContent="space-between">
              <small>Annual Revenue</small>
              <small>
                {revenue[0].toLocaleString()} – {revenue[1].toLocaleString()}
              </small>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Slider
              value={employees}
              onChange={(_, v) => setEmp(v as [number, number])}
              min={0}
              max={10_000}
              step={100}
              valueLabelDisplay="auto"
            />
            <Stack direction="row" justifyContent="space-between">
              <small>Employees</small>
              <small>
                {employees[0]} – {employees[1]}
              </small>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6} display="flex" alignItems="center">
            <Button
              variant="contained"
              onClick={fetchData}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Apply Filters'}
            </Button>
          </Grid>
        </Grid>

        {/* Chart */}
        {chartData.labels.length > 0 && (
          <BarChart
            height={400}
            xAxis={[{ scaleType: 'band', data: chartData.labels }]}
            series={[
              {
                data: chartData.counts,
                color: '#1976d2',
                label: '# of Companies',
              },
            ]}
          />
        )}
      </Stack>
    </Card>
  );
}
