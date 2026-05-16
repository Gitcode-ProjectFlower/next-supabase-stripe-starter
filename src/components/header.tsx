'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { UseCasesDropdown } from '@/components/use-cases-dropdown';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { useLocalePath } from '@/utils/use-locale-path';

const navigation = [
  { name: 'Search', href: '/', requiresAuth: false },
  // Use cases dropdown is rendered inline (UseCasesDropdown) right after Search.
  { name: 'Product', href: '/product', requiresAuth: false },
  { name: 'Saved', href: '/selections', requiresAuth: false },
  { name: 'Downloads', href: '/downloads', requiresAuth: true },
  { name: 'History', href: '/activity', requiresAuth: true },
  { name: 'Pricing', href: '/pricing', requiresAuth: false },
  { name: 'About', href: '/about', requiresAuth: false },
  { name: 'Help', href: '/help', requiresAuth: false },
  { name: 'Settings', href: '/settings', requiresAuth: true },
];

export function Header() {
  const pathname = usePathname();
  const getLocalePath = useLocalePath();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const locale = pathname?.split('/')[1] || 'uk';
    window.location.href = `/${locale}`;
  };

  return (
    <header className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo — aligned with sidebar left edge (same container padding) */}
          <div className='flex shrink-0 items-center'>
            <Link href={getLocalePath('/')} className='shrink-0'>
              <Image src='/insidefirms_logo.png' alt='InsideFirms' width={160} height={40} className='h-10 w-auto shrink-0' priority />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex md:items-center md:space-x-4 lg:space-x-6'>
            {navigation.map((item) => {
              // Hide navigation items that require auth if user is not authenticated
              if (item.requiresAuth && !isAuthenticated) {
                return null;
              }
              const itemPath = getLocalePath(item.href);
              const isActive = pathname === itemPath || pathname?.startsWith(itemPath + '/');
              const link = (
                <Link
                  key={item.name}
                  href={itemPath}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              );
              if (item.name === 'Search') {
                return (
                  <div key={item.name} className='flex items-center gap-4 lg:gap-6'>
                    {link}
                    <UseCasesDropdown />
                  </div>
                );
              }
              return link;
            })}
            {isAuthenticated ? (
              <Button variant='ghost' size='sm' onClick={handleLogout} className='text-gray-700 hover:text-gray-900'>
                <LogOut className='mr-2 h-4 w-4' />
                Logout
              </Button>
            ) : (
              <Button variant='default' size='sm' asChild className='bg-blue-600 text-white hover:bg-blue-700'>
                <Link href={getLocalePath('/login')}>Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className='flex md:hidden'>
            <button
              type='button'
              className='text-gray-700 hover:text-gray-900'
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className='sr-only'>Open menu</span>
              {mobileMenuOpen ? (
                <X className='h-6 w-6' aria-hidden='true' />
              ) : (
                <Menu className='h-6 w-6' aria-hidden='true' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className='space-y-1 border-t border-gray-200 py-4 md:hidden'>
            {navigation.map((item) => {
              // Hide navigation items that require auth if user is not authenticated
              if (item.requiresAuth && !isAuthenticated) {
                return null;
              }
              const itemPath = getLocalePath(item.href);
              const isActive = pathname === itemPath || pathname?.startsWith(itemPath + '/');
              const link = (
                <Link
                  key={item.name}
                  href={itemPath}
                  className={`block rounded-md px-3 py-2 text-base font-medium ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
              if (item.name === 'Search') {
                return (
                  <div key={item.name}>
                    {link}
                    <Link
                      href={getLocalePath('/use-cases')}
                      onClick={() => setMobileMenuOpen(false)}
                      className='block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    >
                      Use cases
                    </Link>
                  </div>
                );
              }
              return link;
            })}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className='flex w-full items-center rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              >
                <LogOut className='mr-2 h-4 w-4' />
                Logout
              </button>
            ) : (
              <Link
                href={getLocalePath('/login')}
                className='block rounded-md px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50'
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
