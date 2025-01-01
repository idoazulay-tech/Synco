import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export const AppLayout = ({ children, hideNav = false, className }: AppLayoutProps) => {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <main className={cn('pb-20', hideNav && 'pb-0')}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
