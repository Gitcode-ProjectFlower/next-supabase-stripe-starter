'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Selections', href: '/selections' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Settings', href: '/settings' },
];

export function Header() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const supabase = createSupabaseBrowserClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                            App
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-6">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`text-sm font-medium transition-colors ${isActive
                                        ? 'text-blue-600'
                                        : 'text-gray-700 hover:text-gray-900'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-gray-700 hover:text-gray-900"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden">
                        <button
                            type="button"
                            className="text-gray-700 hover:text-gray-900"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <span className="sr-only">Open menu</span>
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-1 border-t border-gray-200">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`block px-3 py-2 text-base font-medium rounded-md ${isActive
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md flex items-center"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </button>
                    </div>
                )}
            </nav>
        </header>
    );
}
