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
      {/* FAB - centered and prominent above nav */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-50">
        <motion.button
          onClick={() => navigate('/add')}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD93D 100%)',
            boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4), 0 2px 10px rgba(247, 147, 30, 0.3)',
          }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          data-testid="button-add-task"
        >
          <Plus className="w-7 h-7 text-white drop-shadow-md" />
        </motion.button>
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
                  {isActive && (
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
