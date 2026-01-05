import { Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Archive, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'בית', path: '/' },
  { icon: Calendar, label: 'יום', path: '/day' },
  { icon: CalendarDays, label: 'חודש', path: '/month' },
  { icon: Archive, label: 'ארון', path: '/standby' },
  { icon: Settings, label: 'הגדרות', path: '/settings' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      {/* Sunset FAB - positioned above nav, 10% hidden by toolbar like sun on horizon */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[52px] z-50 pointer-events-none">
        <div className="relative overflow-hidden" style={{ height: '50px' }}>
          <motion.button
            onClick={() => navigate('/add')}
            className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #FF6B35 0%, #F7931E 40%, #FFD93D 80%, #FFF8DC 100%)',
              boxShadow: '0 -4px 20px rgba(255, 107, 53, 0.5), 0 0 30px rgba(247, 147, 30, 0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="button-add-task"
          >
            <Plus className="w-7 h-7 text-white drop-shadow-md" style={{ marginTop: '-6px' }} />
          </motion.button>
        </div>
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-10 h-3 blur-sm opacity-40"
          style={{
            background: 'linear-gradient(180deg, #FFD93D 0%, transparent 100%)',
            top: '50px',
          }}
        />
      </div>

      {/* Navigation bar - the "water" */}
      <nav className="bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center justify-center h-16 max-w-lg mx-auto px-2 gap-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const insertFabAfter = index === 2;
            
            return (
              <Fragment key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'relative flex flex-col items-center justify-center flex-1 h-full gap-1',
                    'transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  data-testid={`nav-${item.path.slice(1) || 'home'}`}
                >
                  {isActive && item.path === '/' && (
                    <motion.div
                      layoutId="home-highlight"
                      className="absolute inset-1 rounded-xl border-2 border-primary/60"
                    />
                  )}
                  {isActive && item.path !== '/' && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-px inset-x-2 h-0.5 bg-primary rounded-full"
                    />
                  )}
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
                {insertFabAfter && (
                  <div className="w-16 h-full flex-shrink-0" />
                )}
              </Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
