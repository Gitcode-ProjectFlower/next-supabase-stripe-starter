import { PropsWithChildren } from 'react';

import { Header } from '@/components/header';

export default function AccountLayout({ children }: PropsWithChildren) {
    return (
        <>
            <Header />
            <main>{children}</main>
        </>
    );
}
