import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // change to 'dark' if you prefer
    primary: {
      main: '#3b3b3bff',
    },
    background: {
      default: '#1a1a1aff',
    },
  },
});

export default theme;