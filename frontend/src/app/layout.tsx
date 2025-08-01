'use client';

import './globals.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme'; // path to the file above
import { AppBar, Toolbar, Tabs, Tab, Container } from '@mui/material';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppBar position="static">
            <Toolbar>
              <Tabs value={false} textColor="inherit">
                <Tab label="Practice" component={Link} href="/" />
                <Tab label="Add Words" component={Link} href="/add" />
                <Tab label="Statistics" component={Link} href="/statistics" />
              </Tabs>
            </Toolbar>
          </AppBar>
          <Container sx={{ mt: 4 }}>{children}</Container>
        </ThemeProvider>
      </body>
    </html>
  );
}
