import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Heart } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              data-testid="button-back"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg font-bold">אודות</h1>
            
            <div className="w-10" />
          </div>
        </header>

        <div className="p-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">טיימר משימות</h2>
            <p className="text-muted-foreground">גרסה 1.0.0</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <h3 className="font-medium mb-2">מה האפליקציה עושה?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              טיימר משימות עוזר לך לנהל את הזמן שלך ביעילות. 
              צור משימות עם זמני התחלה וסיום, עקוב אחרי ההתקדמות בזמן אמת, 
              ושמור תבניות לשימוש חוזר בארון המשימות.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <h3 className="font-medium mb-2">תכונות עיקריות</h3>
            <ul className="text-muted-foreground text-sm space-y-2">
              <li>תצוגת יומן עם ציר זמן</li>
              <li>טיימר חזותי עם אחוזי התקדמות</li>
              <li>ארון משימות לתבניות חוזרות</li>
              <li>סטטיסטיקות והיסטוריה</li>
              <li>תמיכה מלאה בעברית</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
          >
            <span>נבנה עם</span>
            <Heart className="w-4 h-4 text-destructive" />
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AboutPage;
