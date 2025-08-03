// components/UserTable.tsx
import {
  Box,
  Chip,
  IconButton,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Avatar,
  Stack,
  Typography,
  useTheme,
  Paper,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: 'active' | 'pending' | 'banned' | 'rejected';
}

const rows: Row[] = [
  {
    id: 1,
    name: 'Angelique Morse',
    email: 'angelique@example.com',
    phone: '+46 8 123 456',
    company: 'Wuckert Inc',
    role: 'Content Creator',
    status: 'banned',
  },
  {
    id: 2,
    name: 'Ariana Lang',
    email: 'ariana@example.com',
    phone: '+54 11 1234-5678',
    company: 'Feest Group',
    role: 'IT Administrator',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Aspen Schmitt',
    email: 'aspen@example.com',
    phone: '+34 91 123 4567',
    company: 'Kihn, Marquardt and Crist',
    role: 'Financial Planner',
    status: 'banned',
  },
  {
    id: 4,
    name: 'Brycen Jimenez',
    email: 'brycen@example.com',
    phone: '+52 55 1234 5678',
    company: 'Rempel, Hand and Herzog',
    role: 'HR Recruiter',
    status: 'active',
  },
  {
    id: 5,
    name: 'Chase Day',
    email: 'chase@example.com',
    phone: '+86 10 1234 5678',
    company: 'Mraz, Donnelly and Collins',
    role: 'Graphic Designer',
    status: 'banned',
  },
];

const statusColor = (s: Row['status']) =>
  ({
    active: '#4caf50',
    pending: '#ffb547',
    banned: '#f44336',
    rejected: '#9e9e9e',
  }[s]);

const statusOrder: Row['status'][] = ['all', 'active', 'pending', 'banned', 'rejected'] as any;

export default function UserTable() {
  const theme = useTheme();
  const [tab, setTab] = useState<Row['status'] | 'all'>('all');
  const [roleFilter, setRole] = useState<string>('all');
  const [search, setSearch] = useState('');

  /* -------------- 过滤数据 -------------- */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (search && !`${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [tab, roleFilter, search]);

  /* -------------- 所有角色（下拉） -------------- */
  const roles = Array.from(new Set(rows.map((r) => r.role)));

  /* -------------- 列定义 -------------- */
  const cols: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.5,
      sortable: true,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.light }}
          >
            {row.name[0]}
          </Avatar>
          <Box>
            <Typography fontWeight={600}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { field: 'phone', headerName: 'Phone number', flex: 1 },
    { field: 'company', headerName: 'Company', flex: 1.4 },
    { field: 'role', headerName: 'Role', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      renderCell: ({ value }) => (
        <Chip
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          size="small"
          sx={{
            backgroundColor: statusColor(value),
            color: '#fff',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: () => (
        <>
          <IconButton size="small" color="primary">
            <EditIcon fontSize="inherit" />
          </IconButton>
          <IconButton size="small">
            <MoreVertIcon fontSize="inherit" />
          </IconButton>
        </>
      ),
    },
  ];

  /* -------------- 自定义工具栏（Tabs + Filter + Search） -------------- */
  function Toolbar() {
    return (
      <GridToolbarContainer
        sx={{
          pb: 1,
          px: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', minHeight: 32 },
          }}
        >
          {(['all', 'active', 'pending', 'banned', 'rejected'] as const).map((key) => (
            <Tab
              key={key}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                  {key === 'all'
                    ? rows.length
                    : rows.filter((r) => r.status === key).length}
                </Stack>
              }
              value={key}
            />
          ))}
        </Tabs>

        {/* Role select + Search */}
        <Stack direction="row" spacing={2} width="100%">
          <Select
            size="small"
            value={roleFilter}
            onChange={(e) => setRole(e.target.value)}
            sx={{ width: 180 }}
          >
            <MenuItem value="all">Role</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>

          <TextField
            size="small"
            placeholder="Search…"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* DataGrid 自带列显示/密度按钮示例，可保留 */}
          <GridToolbarColumnsButton />
          <GridToolbarDensitySelector />
        </Stack>
      </GridToolbarContainer>
    );
  }

  return (
    <Paper elevation={0}>
      <DataGrid
        autoHeight
        rows={filtered}
        columns={cols}
        checkboxSelection
        disableRowSelectionOnClick
        pageSizeOptions={[5, 10]}
        slots={{ toolbar: Toolbar }}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: theme.palette.action.hover,
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
          },
        }}
      />
    </Paper>
  );
}
