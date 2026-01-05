import { cn } from '@/utils/cn';

interface FullPageLoaderProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  spinnerClassName?: string;
  textClassName?: string;
}

export function FullPageLoader({
  text = 'Loading...',
  fullScreen = false,
  className,
  spinnerClassName,
  textClassName,
}: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        fullScreen ? 'min-h-screen' : 'h-full',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent',
          spinnerClassName
        )}
      />
      <p className={cn('mt-4 text-gray-600', textClassName)}>{text}</p>
    </div>
  );
}
