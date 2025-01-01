import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Archive, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'בית', path: '/' },
  { icon: Calendar, label: 'יום', path: '/day' },
  { icon: CalendarDays, label: 'חודש', path: '/month' },
  { icon: Archive, label: 'המתנה', path: '/standby' },
  { icon: Settings, label: 'הגדרות', path: '/settings' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border z-40 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center w-16 h-full gap-1',
                'transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
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
          );
        })}
      </div>

      {/* Floating Add Button */}
      <motion.button
        onClick={() => navigate('/add')}
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary flex items-center justify-center card-shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>
    </nav>
  );
};
