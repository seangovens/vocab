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
            <AppBar
                position='fixed'
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} >
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
            <Toolbar /> {/* Spacer for fixed AppBar */}
            <Container
                sx={{
                    mt: 4,
                    position: 'relative',
                    minHeight: 'calc(100vh - 64px)'
                }} >
                {children}
            </Container>
        </ThemeProvider>
        </body>
    </html>
    );
}
