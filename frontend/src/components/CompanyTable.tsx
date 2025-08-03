import {
  Box, Chip, Collapse, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useState } from 'react';

type Row = {
  id: string;
  name: string;
  level: number;
  country: string;
  annualRevenue: number;
  employees: number;
  cities: { city: string; founded: number; revenue: number; employees: number }[];
};

const rows: Row[] = [
  {
    id: 'C0',
    name: 'Rodriguez Inc',
    level: 1,
    country: 'China',
    annualRevenue: 317_736,
    employees: 4_606,
    cities: [
      { city: 'Beijing', founded: 1994, revenue: 200_000, employees: 2_400 },
      { city: 'Shanghai', founded: 2001, revenue: 117_736, employees: 2_206 },
    ],
  },
  {
    id: 'C01',
    name: 'Doyle Ltd',
    level: 2,
    country: 'Japan',
    annualRevenue: 429_408,
    employees: 889,
    cities: [{ city: 'Nagoya', founded: 1917, revenue: 429_408, employees: 889 }],
  },
];

const eff = (r: Row) => (r.annualRevenue / r.employees).toFixed(0);

export default function CompanyTable() {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Name</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Country</TableCell>
            <TableCell>Rev / Emp.</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <RowItem key={r.id} row={r} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function RowItem({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const ratio = eff(row);

  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.level}</TableCell>
        <TableCell>{row.country}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={ratio}
            sx={{
              bgcolor: Number(ratio) > 100 ? 'success.main' : 'warning.main',
              color: 'common.white',
            }}
          />
        </TableCell>
      </TableRow>
      <TableRow sx={{ p: 0 }}>
        <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>City</TableCell>
                    <TableCell>Founded Year</TableCell>
                    <TableCell>Annual Revenue</TableCell>
                    <TableCell>Employees</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.cities.map((c) => (
                    <TableRow key={c.city}>
                      <TableCell>{c.city}</TableCell>
                      <TableCell>{c.founded}</TableCell>
                      <TableCell>{c.revenue.toLocaleString()}</TableCell>
                      <TableCell>{c.employees}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
