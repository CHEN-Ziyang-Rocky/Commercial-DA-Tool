import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2065d1' },
    background: { default: '#000000', paper: '#0d1117' },
  },
  shape: { borderRadius: 8 },
});

export default theme;
