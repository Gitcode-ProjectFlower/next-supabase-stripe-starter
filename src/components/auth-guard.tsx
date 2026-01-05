'use client';

import { useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { LockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FullPageLoader } from './full-page-loader';
import { Button } from './ui/button';

interface SignInIsRequiredProps {
  description: string;
  children: React.ReactNode;
}

export function AuthGuard({ description, children }: SignInIsRequiredProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAuthenticated(!!user);
      setIsLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoading) return <FullPageLoader />;

  return isAuthenticated ? (
    children
  ) : (
    <div className='flex h-full flex-1 flex-col items-center justify-center'>
      <div className='text-center'>
        <LockIcon className='mx-auto h-24 w-24 text-gray-400' />
        <h2 className='mt-4 text-2xl font-bold text-gray-900'>Sign in required</h2>
        <p className='mt-2 text-gray-600'>{description}</p>
        <Button
          className='mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
          onClick={() => router.push('/login')}
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}
