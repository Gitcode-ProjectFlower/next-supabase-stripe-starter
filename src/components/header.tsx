'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

const navigation = [
  { name: 'Dashboard', href: '/', requiresAuth: false },
  { name: 'Selections', href: '/selections', requiresAuth: false },
  { name: 'Recent Activity', href: '/activity', requiresAuth: true },
  { name: 'Pricing', href: '/pricing', requiresAuth: false },
  { name: 'Settings', href: '/settings', requiresAuth: true },
];

export function Header() {
  const pathname = usePathname();
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
    window.location.href = '/';
  };

  return (
    <header className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
      <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center'>
            <Link href='/' className='text-xl font-bold text-gray-900'>
              App
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex md:items-center md:space-x-6'>
            {navigation.map((item) => {
              // Hide navigation items that require auth if user is not authenticated
              if (item.requiresAuth && !isAuthenticated) {
                return null;
              }
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <Button variant='ghost' size='sm' onClick={handleLogout} className='text-gray-700 hover:text-gray-900'>
                <LogOut className='mr-2 h-4 w-4' />
                Logout
              </Button>
            ) : (
              <Button variant='default' size='sm' asChild className='bg-blue-600 text-white hover:bg-blue-700'>
                <Link href='/login'>Sign In</Link>
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
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-base font-medium ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
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
                href='/login'
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
