'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('./AppShell'), {
    ssr: false,
});

export default function AppShellLoader() {
    return <AppShell />;
}
