import { PropsWithChildren } from 'react';

import { Header } from '@/components/header';

export default function DashboardLayout({ children }: PropsWithChildren) {
    return (
        <>
            <Header />
            <main>{children}</main>
        </>
    );
}
