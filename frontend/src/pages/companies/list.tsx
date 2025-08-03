import { Typography } from '@mui/material';
import CompanyTable from '../../components/CompanyTable';

export default function CompanyListPage() {
  return (
    <>
      <Typography variant="h4" mb={2}>
        Company List
      </Typography>
      <CompanyTable />
    </>
  );
}
