import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // change to 'dark' if you prefer
    primary: {
        main: '#e0e0e0',
        contrastText: '#282828',
    },
    secondary: {
        main: '#bea7da',
    },
    success: { main: '#41aa4d' },
    error: { main: '#c4463d' },
    background: {
        default: '#282828',
        paper: '#212121',
    },
  },
});

export default theme;