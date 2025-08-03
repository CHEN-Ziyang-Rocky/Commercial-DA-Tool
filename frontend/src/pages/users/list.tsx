import { Typography } from '@mui/material';
import UserTable from '../../components/UserTable';

export default function UserListPage() {
  return (
    <>
      <Typography variant="h4" mb={2}>
        User List
      </Typography>
      <UserTable />
    </>
  );
}
