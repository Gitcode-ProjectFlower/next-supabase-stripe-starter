'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { UseCasesDropdown } from '@/components/use-cases-dropdown';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { useLocalePath } from '@/utils/use-locale-path';

const navigation = [
  { name: 'Search', href: '/', requiresAuth: false },
  // Use cases dropdown is rendered inline (UseCasesDropdown) right after Saved.
  { name: 'Saved', href: '/selections', requiresAuth: false },
  { name: 'Product', href: '/product', requiresAuth: false },
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
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const mobileMenuExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const startMobileMenuClose = () => {
    if (!mobileMenuOpen || mobileMenuClosing) return;
    setMobileMenuClosing(true);
    mobileMenuExitTimer.current = setTimeout(() => {
      mobileMenuExitTimer.current = null;
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 140);
  };

  const openMobileMenu = () => {
    if (mobileMenuExitTimer.current) {
      clearTimeout(mobileMenuExitTimer.current);
      mobileMenuExitTimer.current = null;
    }
    setMobileMenuClosing(false);
    setMobileMenuOpen(true);
  };

  useEffect(
    () => () => {
      if (mobileMenuExitTimer.current) clearTimeout(mobileMenuExitTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startMobileMenuClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      startMobileMenuClose();
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) startMobileMenuClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileMenuOpen, mobileMenuClosing]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const locale = pathname?.split('/')[1] || 'uk';
    window.location.href = `/${locale}`;
  };

  return (
    <header className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
      <nav className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Top'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo — aligned with sidebar left edge (same container padding) */}
          <div className='flex shrink-0 items-center'>
            <Link href={getLocalePath('/')} className='shrink-0'>
              <Image
                src='/insidefirms_logo.png'
                alt='InsideFirms'
                width={160}
                height={40}
                className='h-8 w-auto shrink-0 sm:h-10'
                priority
              />
            </Link>
          </div>

          {/* Right group — inline nav where it fits + burger/auth controls */}
          <div className='flex items-center gap-4 2xl:gap-6'>
            {/* Inline navigation — only where it fits (lg+) */}
            <div className='hidden items-center gap-4 lg:flex 2xl:gap-6'>
              {navigation.map((item) => {
                if (item.requiresAuth && !isAuthenticated) {
                  return null;
                }
                const itemPath = getLocalePath(item.href);
                const isActive = pathname === itemPath || pathname?.startsWith(itemPath + '/');
                const link = (
                  <Link
                    key={item.name}
                    href={itemPath}
                    className={`shrink-0 whitespace-nowrap text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
                if (item.name === 'Saved') {
                  return (
                    <span key={item.name} className='flex shrink-0 items-center gap-4 2xl:gap-6'>
                      {link}
                      <UseCasesDropdown />
                    </span>
                  );
                }
                return link;
              })}
            </div>

            <div className='flex shrink-0 items-center gap-1'>
              <div ref={buttonRef} className='lg:hidden'>
                <button
                  type='button'
                  className='rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  onClick={() => (mobileMenuOpen ? startMobileMenuClose() : openMobileMenu())}
                  aria-expanded={mobileMenuOpen}
                >
                  <span className='sr-only'>{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
                  {mobileMenuOpen ? (
                    <X className='h-6 w-6' aria-hidden='true' />
                  ) : (
                    <Menu className='h-6 w-6' aria-hidden='true' />
                  )}
                </button>
              </div>
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
          </div>
        </div>

        {/* Overlay menu — floats above page content */}
        {mobileMenuOpen && (
          <div
            ref={menuRef}
            className={`menu-overlay absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-gray-200 bg-white shadow-lg${
              mobileMenuClosing ? ' menu-overlay-closing' : ''
            }`}
          >
            <div className='mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6 lg:px-8'>
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
                    className={`block rounded-md px-3 py-2.5 text-base font-medium sm:py-2 ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => startMobileMenuClose()}
                  >
                    {item.name}
                  </Link>
                );
                if (item.name === 'Saved') {
                  return (
                    <div key={item.name}>
                      {link}
                      <Link
                        href={getLocalePath('/use-cases')}
                        onClick={() => startMobileMenuClose()}
                        className='block rounded-md px-3 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 sm:py-2'
                      >
                        Use cases
                      </Link>
                    </div>
                  );
                }
                return link;
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
