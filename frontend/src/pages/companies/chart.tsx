import { Typography } from '@mui/material';
import CompanyDynamicBar from '../../components/CompanyDynamicBar';

export default function CompanyChartPage() {
  return (
    <>
      <Typography variant="h4" mb={2}>
        Company Dynamic Bar Chart
      </Typography>
      <CompanyDynamicBar />
    </>
  );
}
