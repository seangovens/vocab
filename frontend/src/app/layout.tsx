'use client';

import './globals.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme';
import { AppBar, Toolbar, Tabs, Tab, Container } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children } : { children: React.ReactNode }) {
    const tabPathName = usePathname();

    const tabValue =
        tabPathName === '/' ? '/' :
        tabPathName.startsWith('/add') ? '/add' :
        tabPathName.startsWith('/statistics') ? '/statistics' :
        false;

    return (
    <html lang='en'>
        <body>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position='static'>
                <Toolbar>
                    <Tabs
                        value={tabValue}
                        textColor='inherit'
                        indicatorColor='secondary' >
                        <Tab
                            label='Practice'
                            value='/'
                            component={Link}
                            href='/' />
                        <Tab
                            label='Add Words'
                            value='/add'
                            component={Link}
                            href='/add' />
                        <Tab
                            label='Statistics'
                            value='/statistics'
                            component={Link}
                            href='/statistics' />
                    </Tabs>
                </Toolbar>
            </AppBar>
            <Container sx={{ mt: 4 }}>{children}</Container>
        </ThemeProvider>
        </body>
    </html>
    );
}
