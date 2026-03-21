import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripVertical, Check, MessageCircle, Zap, ChevronLeft, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const USER_ID = 'default-user';

interface BehaviorPattern {
  examples: string[];
  triggerType: string;
  reactionPattern: string;
  intensity?: number;
}

interface DifficultyDef {
  key: string;
  label: string;
  triggers: string[];
  reactions: string[];
  examplePrompt: string;
  triggerPrompt: string;
  reactionPrompt: string;
}

const DIFFICULTIES: DifficultyDef[] = [
  {
    key: 'procrastination',
    label: 'דחיינות',
    examplePrompt: 'אמרת דחיינות.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה יותר כי:',
    triggers: ['המשימה גדולה מדי', 'לא ברור מאיפה להתחיל', 'אין אנרגיה', 'מחכה למצב רוח', 'חשש מהתוצאה', 'לא מספיק דחוף'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['עובר למשהו קטן', 'בורח למסך', 'דוחה למחר', 'נכנס ללחץ', 'מתעלם'],
  },
  {
    key: 'overload',
    label: 'עומס',
    examplePrompt: 'אמרת עומס.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'העומס מגיע כי:',
    triggers: ['יותר מדי משימות', 'לא יודע מה קודם', 'כולם רוצים ממני', 'לא יודע לומר לא', 'עומס מידע', 'הכל דחוף'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['קופא', 'עושה את הקל', 'נכנס לפאניקה', 'מתעלם מהכל', 'עובד כמו רובוט'],
  },
  {
    key: 'focus',
    label: 'פיזור וחוסר מיקוד',
    examplePrompt: 'אמרת פיזור.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'הפיזור מגיע כי:',
    triggers: ['המשימה משעממת', 'הרבה דברים בראש', 'הודעות מפריעות', 'אין מבנה ליום', 'עייף', 'קשה לחזור אחרי הפסקה'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['קופץ בין דברים', 'נכנס לטלפון', 'שוכח מה עשיתי', 'מתחיל משהו חדש', 'מאבד זמן'],
  },
  {
    key: 'inconsistency',
    label: 'חוסר עקביות',
    examplePrompt: 'אמרת חוסר עקביות.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['תלוי במצב רוח', 'אין שגרה', 'מתלהב ואז נעלם', 'לא מספיק חשוב', 'שוכח', 'קשה לשמור הרגל'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['מתחיל מחדש', 'מוותר', 'מרגיש אשמה', 'מחפש שיטה חדשה', 'ממשיך כאילו כלום'],
  },
  {
    key: 'time_estimation',
    label: 'איחורים והערכת זמן',
    examplePrompt: 'אמרת איחורים.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['חושב שיש עוד זמן', 'מוסיף עוד דבר קטן', 'לא מרגיש את הזמן עובר', 'אופטימי מדי', 'לא מתכנן מראש', 'לא אוהב להמתין'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['רץ', 'מתנצל', 'מלחיץ את עצמי', 'מפסיד דברים', 'מרגיש רע'],
  },
  {
    key: 'starting',
    label: 'קושי להתחיל',
    examplePrompt: 'אמרת קושי להתחיל.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'קשה להתחיל כי:',
    triggers: ['לא ברור הצעד הראשון', 'המשימה מפחידה', 'צריך שהכל יהיה מושלם', 'אין מוטיבציה', 'לא מספיק דחוף', 'מרגיש עייף'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['עושה דברים אחרים', 'מכין מכין מכין', 'מחכה לרגע הנכון', 'נכנס ללחץ ואז מתחיל', 'מבקש עזרה'],
  },
  {
    key: 'finishing',
    label: 'קושי לסיים',
    examplePrompt: 'אמרת קושי לסיים.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'קשה לסיים כי:',
    triggers: ['מאבד עניין', 'משהו חדש מושך', 'מרגיש שזה מספיק טוב', 'נתקע', 'לא רואה את הסוף', 'עייף מהמשימה'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['עוזב באמצע', 'עובר למשהו חדש', 'חוזר אליו מאוחר', 'מרגיש תסכול', 'גומר חצי חצי'],
  },
  {
    key: 'perfectionism',
    label: 'פרפקציוניזם',
    examplePrompt: 'אמרת פרפקציוניזם.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['לא מספיק טוב', 'פחד מביקורת', 'רוצה שיהיה מושלם', 'חוזר שוב ושוב', 'קשה לשחרר', 'משווה לאחרים'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['ממשיך לשפר', 'לא מגיש', 'מתעכב', 'מבטל הכל', 'מרגיש חסר ערך'],
  },
  {
    key: 'multi_goals',
    label: 'ריבוי מטרות',
    examplePrompt: 'אמרת ריבוי מטרות.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['הכל מעניין', 'פחד לפספס', 'לא יודע מה יותר חשוב', 'רוצה הכל עכשיו', 'קשה לוותר', 'מתלהב מהר'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['מתחיל הרבה', 'לא מסיים כלום', 'מרגיש פיזור', 'מחליף כיוון', 'מרגיש תקוע'],
  },
  {
    key: 'decisions',
    label: 'קושי בקבלת החלטות',
    examplePrompt: 'אמרת קושי בקבלת החלטות.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['פחד לטעות', 'יותר מדי אפשרויות', 'לא מספיק מידע', 'מחכה שמישהו יחליט', 'קשה לוותר על אופציה', 'לא בטוח מה רוצה'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['דוחה את ההחלטה', 'שואל כולם', 'בוחר בברירת מחדל', 'נכנס ללחץ', 'מתעלם'],
  },
  {
    key: 'sensory',
    label: 'ויסות חושי / הצפה',
    examplePrompt: 'מתי אתה מרגיש שיש יותר מדי?',
    triggerPrompt: 'מה מציף אותך יותר:',
    triggers: ['רעש', 'אנשים', 'הודעות', 'מסכים', 'משימות פתוחות', 'עומס מידע', 'תאורה', 'שילוב'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['מתנתק', 'מאבד פוקוס', 'מתעצבן', 'רוצה לברוח', 'ממשיך בכוח'],
  },
  {
    key: 'burnout',
    label: 'שחיקה / ירידת אנרגיה',
    examplePrompt: 'אמרת שחיקה.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['עובד יותר מדי', 'אין הפסקות', 'לא נהנה ממה שעושה', 'לא ישן מספיק', 'מרגיש חסר תכלית', 'לחץ ארוך'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['ממשיך בכוח', 'עוצר הכל', 'ישן הרבה', 'מרגיש אשמה', 'מתנתק'],
  },
  {
    key: 'pressure',
    label: 'לחץ מתמשך',
    examplePrompt: 'אמרת לחץ מתמשך.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'הלחץ מגיע כי:',
    triggers: ['דדליינים צפופים', 'ציפיות גבוהות', 'הרבה אחריות', 'פחד לאכזב', 'לא מספיק זמן', 'תמיד עוד משהו'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['עובד מהר', 'עושה טעויות', 'נכנס לפאניקה', 'מתנתק', 'לא ישן'],
  },
  {
    key: 'people_pleasing',
    label: 'ריצוי אחרים',
    examplePrompt: 'אמרת ריצוי אחרים.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['פחד מדחייה', 'רוצה שיאהבו אותי', 'קשה לי לומר לא', 'מרגיש אחריות על אחרים', 'רגיל לעזור', 'פחד מקונפליקט'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['מסכים לכל דבר', 'מתעלם מהצרכים שלי', 'מרגיש כעס אח"כ', 'עושה הכל בעצמי', 'מרגיש ניצול'],
  },
  {
    key: 'task_switching',
    label: 'קפיצה בין משימות',
    examplePrompt: 'אמרת קפיצה בין משימות.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['משעמם', 'משהו דחוף צץ', 'רעיון חדש', 'לא מתרכז', 'מרגיש שהסתיים', 'הודעה שהגיעה'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['משאיר חצי עשוי', 'שוכח לחזור', 'מרגיש יעיל', 'מתבלבל', 'מסיים רק דחוף'],
  },
  {
    key: 'motivation_loss',
    label: 'איבוד מוטיבציה באמצע',
    examplePrompt: 'אמרת איבוד מוטיבציה.\nתן לי שתי דוגמאות קצרות מהשבוע.',
    triggerPrompt: 'זה קורה כי:',
    triggers: ['לא רואה תוצאות', 'התלהבות ירדה', 'יותר מדי זמן', 'לא מספיק מעניין', 'תחושת חוסר טעם', 'השוואה לאחרים'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['עוזב', 'ממשיך מתוך חובה', 'מחפש משהו חדש', 'מרגיש תקוע', 'מחכה שישוב'],
  },
];

type Step =
  | 'welcome'
  | 'path_select'
  | 'select_difficulties'
  | 'rank_difficulties'
  | 'conversation'
  | 'conversation_confirm'
  | 'mapping'
  | 'smart_stop'
  | 'done';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPath, setSelectedPath] = useState<'quick' | 'conversation' | null>(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [rankedDifficulties, setRankedDifficulties] = useState<string[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<Record<string, BehaviorPattern>>({});
  const [currentMappingIndex, setCurrentMappingIndex] = useState(0);
  const [mappingPhase, setMappingPhase] = useState<'examples' | 'trigger' | 'reaction'>('examples');
  const [examples, setExamples] = useState(['', '']);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedReaction, setSelectedReaction] = useState('');
  const [conversationText, setConversationText] = useState('');
  const [conversationReflection, setConversationReflection] = useState('');
  const [detectedFromConversation, setDetectedFromConversation] = useState<{ key: string; label: string }[]>([]);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [customDifficulty, setCustomDifficulty] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const answeredSteps = useRef<string[]>([]);

  const currentDifficulty = rankedDifficulties[currentMappingIndex];
  const currentDiffDef = DIFFICULTIES.find(d => d.key === currentDifficulty);
  const currentDiffLabel = currentDiffDef?.label || currentDifficulty;

  const customDiffDef: DifficultyDef | null = currentDifficulty && !currentDiffDef ? {
    key: currentDifficulty,
    label: currentDifficulty,
    examplePrompt: `אמרת ${currentDifficulty}.\nתן לי שתי דוגמאות קצרות מהשבוע.`,
    triggerPrompt: 'מה הסיבה העיקרית?',
    triggers: ['לא ברור מאיפה להתחיל', 'אין אנרגיה', 'מחכה למצב רוח', 'חשש מהתוצאה', 'לא מספיק דחוף', 'משהו אחר'],
    reactionPrompt: 'כשזה קורה אתה:',
    reactions: ['דוחה למחר', 'עובר למשהו אחר', 'נכנס ללחץ', 'מתעלם', 'ממשיך בכוח'],
  } : null;

  const activeDiffDef = currentDiffDef || customDiffDef;

  const trackStep = (stepId: string) => {
    if (!answeredSteps.current.includes(stepId)) {
      answeredSteps.current.push(stepId);
    }
  };

  const saveState = useCallback(async (data: Record<string, any>) => {
    try {
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          ...data,
        }),
      });
    } catch (e) {
      console.error('[Onboarding] save error:', e);
    }
  }, []);

  const handleComplete = useCallback(async (patterns: Record<string, BehaviorPattern>) => {
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, behaviorPatterns: patterns }),
    });
    setStep('done');
  }, []);

  const handleSkip = useCallback(async () => {
    await fetch('/api/onboarding/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        behaviorPatterns,
        difficulties: selectedDifficulties,
        rankedDifficulties,
      }),
    });
    navigate('/');
  }, [behaviorPatterns, selectedDifficulties, rankedDifficulties, navigate]);

  const handleConversationSubmit = useCallback(async () => {
    if (!conversationText.trim()) return;
    try {
      const res = await fetch('/api/onboarding/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, text: conversationText }),
      });
      const data = await res.json();
      setConversationReflection(data.reflection);
      if (data.labels?.length > 0) {
        setDetectedFromConversation(data.labels);
        setSelectedDifficulties(data.detectedDifficulties);
        setStep('conversation_confirm');
        trackStep('conversation');
        saveState({ selectedPath: 'conversation', currentStep: 'conversation_confirm' });
      }
    } catch (e) {
      console.error('[Onboarding] conversation error:', e);
    }
  }, [conversationText, saveState]);

  const toggleDifficulty = (key: string) => {
    setSelectedDifficulties(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const addCustomDifficulty = () => {
    if (customDifficulty.trim()) {
      const key = `custom_${customDifficulty.trim().replace(/\s+/g, '_')}`;
      if (!selectedDifficulties.includes(key)) {
        setSelectedDifficulties(prev => [...prev, key]);
      }
      setCustomDifficulty('');
      setShowCustomInput(false);
    }
  };

  const moveToRanking = () => {
    setRankedDifficulties([...selectedDifficulties]);
    setStep('rank_difficulties');
    trackStep('select_difficulties');
    saveState({ difficulties: selectedDifficulties, currentStep: 'rank_difficulties' });
  };

  const startMapping = (index: number) => {
    setCurrentMappingIndex(index);
    setMappingPhase('examples');
    setExamples(['', '']);
    setSelectedTrigger('');
    setSelectedReaction('');
    setStep('mapping');
    trackStep('rank_difficulties');
    saveState({ rankedDifficulties, currentStep: 'mapping', mappedDifficulties: Object.keys(behaviorPatterns) });
  };

  const finishCurrentMapping = () => {
    const pattern: BehaviorPattern = {
      examples: examples.filter(e => e.trim()),
      triggerType: selectedTrigger,
      reactionPattern: selectedReaction,
    };
    const updated = { ...behaviorPatterns, [currentDifficulty]: pattern };
    setBehaviorPatterns(updated);
    trackStep(`mapping_${currentDifficulty}`);

    saveState({
      behaviorPatterns: updated,
      mappedDifficulties: Object.keys(updated),
      currentStep: 'smart_stop',
    });

    const unmappedCount = rankedDifficulties.filter(k => !updated[k]).length;
    if (unmappedCount > 0) {
      setStep('smart_stop');
    } else {
      handleComplete(updated);
    }
  };

  const continueToNextMapping = () => {
    const nextIndex = rankedDifficulties.findIndex((k, i) => i > currentMappingIndex && !behaviorPatterns[k]);
    if (nextIndex !== -1) {
      startMapping(nextIndex);
    } else {
      handleComplete(behaviorPatterns);
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const items = [...rankedDifficulties];
    const [removed] = items.splice(draggedIndex, 1);
    items.splice(index, 0, removed);
    setRankedDifficulties(items);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  const getDiffLabel = (key: string) => {
    const def = DIFFICULTIES.find(d => d.key === key);
    if (def) return def.label;
    if (key.startsWith('custom_')) return key.replace('custom_', '').replace(/_/g, ' ');
    return key;
  };

  const mappedCount = Object.keys(behaviorPatterns).length;
  const nextUnmappedKey = rankedDifficulties.find((k, i) => i > currentMappingIndex && !behaviorPatterns[k]);
  const nextUnmappedLabel = nextUnmappedKey ? getDiffLabel(nextUnmappedKey) : '';

  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <div className="absolute top-4 left-4 z-50">
        {step !== 'welcome' && step !== 'done' && (
          <button
            onClick={() => setShowSkipModal(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            data-testid="button-skip-onboarding"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div key="welcome" {...pageTransition} className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold" data-testid="text-welcome-title">אני סינקו.</h1>
                  <div className="text-muted-foreground leading-relaxed space-y-3 text-right">
                    <p>אני כאן כדי לעזור לך לסנכרן את הקצב שלך עם העולם – בלי להעמיס עליך לוז כבד.</p>
                    <p>מה שנעשה עכשיו זו רק התחלה. תוך כדי שימוש אני אלמד את הדרך שאתה עובד, את סדרי העדיפויות שלך, ואת הדפוסים שלך.</p>
                    <p>אתה לא צריך להסביר הכל מושלם. תהיה טבעי — אני כבר אתאים את עצמי אליך.</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-foreground font-medium">אז בוא נתחיל בשאלת מיליון הדולר:</p>
                    <p className="text-muted-foreground mt-1">באת להיות יותר אמיץ? יותר חתיך? או להבין סוף סוף את משמעות החיים?</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">סתם. בלי דרמות. בוא נכיר.</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full mt-6"
                  onClick={() => setStep('path_select')}
                  data-testid="button-start-onboarding"
                >
                  יאללה, בוא נתחיל
                </Button>
              </motion.div>
            )}

            {step === 'path_select' && (
              <motion.div key="path_select" {...pageTransition} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold" data-testid="text-path-title">בוא נכיר</h2>
                  <p className="text-muted-foreground">אני הולך להכיר את הדרך שבה אתה עובד. אין פתרונות עדיין — רק להבין דפוסים.</p>
                  <p className="text-sm text-muted-foreground mt-1">יש לי רשימה רחבה של קשיים נפוצים בניהול עצמי. אתה לא צריך להתאים את עצמך אליה — אתה יכול גם לכתוב במילים שלך.</p>
                  <p className="text-muted-foreground font-medium mt-3">איך אתה רוצה להתחיל?</p>
                </div>
                <div className="space-y-3">
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedPath('conversation');
                      setStep('conversation');
                      saveState({ selectedPath: 'conversation', currentStep: 'conversation' });
                    }}
                    data-testid="card-path-conversation"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">שיחת היכרות פתוחה</p>
                        <p className="text-sm text-muted-foreground">תספר ואני אמקד תוך כדי.</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedPath('quick');
                      setStep('select_difficulties');
                      saveState({ selectedPath: 'quick', currentStep: 'select_difficulties' });
                    }}
                    data-testid="card-path-quick"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">מיקוד מהיר</p>
                        <p className="text-sm text-muted-foreground">אני אתן אפשרויות ואתה תבחר.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {step === 'conversation' && (
              <motion.div key="conversation" {...pageTransition} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold" data-testid="text-conversation-title">ספר לי</h2>
                  <p className="text-muted-foreground">מה מביא אותך להשתמש בי עכשיו?</p>
                </div>
                <Textarea
                  value={conversationText}
                  onChange={(e) => setConversationText(e.target.value)}
                  placeholder="ספר בחופשיות..."
                  className="min-h-[120px] text-right"
                  dir="rtl"
                  data-testid="input-conversation"
                />
                {conversationReflection && !detectedFromConversation.length && (
                  <p className="text-muted-foreground text-sm bg-muted/50 rounded-lg p-3" data-testid="text-reflection">
                    {conversationReflection}
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={handleConversationSubmit}
                  disabled={!conversationText.trim()}
                  data-testid="button-send-conversation"
                >
                  שלח
                </Button>
              </motion.div>
            )}

            {step === 'conversation_confirm' && (
              <motion.div key="conversation_confirm" {...pageTransition} className="space-y-6">
                <div className="space-y-3 text-right">
                  <p className="text-muted-foreground" data-testid="text-conversation-reflection">{conversationReflection}</p>
                  <p className="font-medium">זה נשמע כמו:</p>
                </div>
                <div className="space-y-2">
                  {detectedFromConversation.map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDifficulty(d.key)}
                      className={cn(
                        'w-full flex items-center gap-2 p-3 rounded-xl border text-right transition-all',
                        selectedDifficulties.includes(d.key)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border'
                      )}
                      data-testid={`button-confirm-${d.key}`}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                        selectedDifficulties.includes(d.key)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/30'
                      )}>
                        {selectedDifficulties.includes(d.key) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground text-center">מה הכי קרוב? אפשר להוסיף עוד או להמשיך.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('select_difficulties');
                      saveState({ selectedPath: 'conversation_to_quick', currentStep: 'select_difficulties' });
                    }}
                    data-testid="button-add-more"
                  >
                    להוסיף עוד
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={selectedDifficulties.length === 0}
                    onClick={moveToRanking}
                    data-testid="button-continue-ranking"
                  >
                    להמשיך
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'select_difficulties' && (
              <motion.div key="select_difficulties" {...pageTransition} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold" data-testid="text-difficulties-title">מה מאתגר אותך?</h2>
                  <p className="text-muted-foreground text-sm">בחר מה רלוונטי כרגע (אפשר כמה).</p>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pb-2">
                  {DIFFICULTIES.map(d => {
                    const isSelected = selectedDifficulties.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => toggleDifficulty(d.key)}
                        className={cn(
                          'p-3 rounded-xl text-sm text-right border transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'bg-card border-border hover:border-primary/40'
                        )}
                        data-testid={`button-difficulty-${d.key}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                  {selectedDifficulties.filter(k => k.startsWith('custom_')).map(k => (
                    <button
                      key={k}
                      onClick={() => toggleDifficulty(k)}
                      className="p-3 rounded-xl text-sm text-right border bg-primary/10 border-primary text-primary font-medium transition-all"
                      data-testid={`button-difficulty-${k}`}
                    >
                      {k.replace('custom_', '').replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-show-custom"
                  >
                    <Plus className="w-4 h-4" />
                    אחר — לכתוב במילים שלי
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={customDifficulty}
                      onChange={(e) => setCustomDifficulty(e.target.value)}
                      placeholder="תכתוב במילים שלך..."
                      className="text-right flex-1"
                      dir="rtl"
                      onKeyDown={(e) => e.key === 'Enter' && addCustomDifficulty()}
                      data-testid="input-custom-difficulty"
                    />
                    <Button
                      size="sm"
                      onClick={addCustomDifficulty}
                      disabled={!customDifficulty.trim()}
                      data-testid="button-add-custom"
                    >
                      הוסף
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={selectedDifficulties.length === 0}
                  onClick={moveToRanking}
                  data-testid="button-to-ranking"
                >
                  המשך ({selectedDifficulties.length} נבחרו)
                </Button>
              </motion.div>
            )}

            {step === 'rank_difficulties' && (
              <motion.div key="rank_difficulties" {...pageTransition} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold" data-testid="text-rank-title">סדר לפי חשיבות</h2>
                  <p className="text-muted-foreground text-sm">גרור מהכי משמעותי למעלה לפחות משמעותי למטה.</p>
                </div>
                <div className="space-y-2">
                  {rankedDifficulties.map((key, index) => (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border bg-card cursor-grab active:cursor-grabbing transition-all',
                        draggedIndex === index && 'opacity-50 border-primary'
                      )}
                      data-testid={`rank-item-${key}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                      <span className="flex-1">{getDiffLabel(key)}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => startMapping(0)} data-testid="button-start-mapping">
                  בוא נתחיל להכיר
                </Button>
              </motion.div>
            )}

            {step === 'mapping' && activeDiffDef && (
              <motion.div key={`mapping-${currentDifficulty}-${mappingPhase}`} {...pageTransition} className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {mappedCount + 1} / {rankedDifficulties.length}
                  </span>
                  {mappingPhase !== 'examples' && (
                    <button
                      onClick={() => {
                        if (mappingPhase === 'trigger') setMappingPhase('examples');
                        else if (mappingPhase === 'reaction') setMappingPhase('trigger');
                      }}
                      className="text-xs text-muted-foreground flex items-center gap-1"
                      data-testid="button-back-mapping"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      חזרה
                    </button>
                  )}
                </div>

                {mappingPhase === 'examples' && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="whitespace-pre-line text-sm" data-testid="text-example-prompt">{activeDiffDef.examplePrompt}</p>
                    </div>
                    <div className="space-y-3">
                      <Textarea
                        value={examples[0]}
                        onChange={(e) => setExamples([e.target.value, examples[1]])}
                        placeholder="דוגמה ראשונה..."
                        className="min-h-[60px] text-right"
                        dir="rtl"
                        data-testid="input-example-1"
                      />
                      <Textarea
                        value={examples[1]}
                        onChange={(e) => setExamples([examples[0], e.target.value])}
                        placeholder="דוגמה שנייה (אופציונלי)..."
                        className="min-h-[60px] text-right"
                        dir="rtl"
                        data-testid="input-example-2"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!examples[0].trim()}
                      onClick={() => setMappingPhase('trigger')}
                      data-testid="button-next-trigger"
                    >
                      המשך
                    </Button>
                  </div>
                )}

                {mappingPhase === 'trigger' && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-sm font-medium" data-testid="text-trigger-prompt">{activeDiffDef.triggerPrompt}</p>
                    </div>
                    <div className="space-y-2">
                      {activeDiffDef.triggers.map(trigger => (
                        <button
                          key={trigger}
                          onClick={() => setSelectedTrigger(trigger)}
                          className={cn(
                            'w-full text-right p-3 rounded-xl text-sm border transition-all',
                            selectedTrigger === trigger
                              ? 'bg-primary/10 border-primary text-primary font-medium'
                              : 'bg-card border-border hover:border-primary/40'
                          )}
                          data-testid={`button-trigger-${trigger}`}
                        >
                          {trigger}
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={!selectedTrigger}
                      onClick={() => setMappingPhase('reaction')}
                      data-testid="button-next-reaction"
                    >
                      המשך
                    </Button>
                  </div>
                )}

                {mappingPhase === 'reaction' && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-sm font-medium" data-testid="text-reaction-prompt">{activeDiffDef.reactionPrompt}</p>
                    </div>
                    <div className="space-y-2">
                      {activeDiffDef.reactions.map(reaction => (
                        <button
                          key={reaction}
                          onClick={() => setSelectedReaction(reaction)}
                          className={cn(
                            'w-full text-right p-3 rounded-xl text-sm border transition-all',
                            selectedReaction === reaction
                              ? 'bg-primary/10 border-primary text-primary font-medium'
                              : 'bg-card border-border hover:border-primary/40'
                          )}
                          data-testid={`button-reaction-${reaction}`}
                        >
                          {reaction}
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={!selectedReaction}
                      onClick={finishCurrentMapping}
                      data-testid="button-finish-mapping"
                    >
                      הבנתי אותך. רשמתי.
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'smart_stop' && (
              <motion.div key="smart_stop" {...pageTransition} className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold" data-testid="text-smart-stop-title">
                    הבנתי. רשמתי.
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    מיפיתי את {currentDiffLabel}.
                  </p>
                </div>
                {nextUnmappedKey && (
                  <p className="text-muted-foreground">
                    רוצה שנמפה גם את <span className="font-medium text-foreground">{nextUnmappedLabel}</span> עכשיו, או שנתחיל לעבוד ונעמיק בהמשך?
                  </p>
                )}
                <div className="space-y-2">
                  {nextUnmappedKey && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={continueToNextMapping}
                      data-testid="button-map-next"
                    >
                      להעמיק בקושי הבא
                    </Button>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => handleComplete(behaviorPatterns)}
                    data-testid="button-start-working"
                  >
                    בוא נתחיל לעבוד
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" {...pageTransition} className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-500" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold" data-testid="text-done-title">סגור. זה דפוס חשוב.</h2>
                  <p className="text-muted-foreground">רשמתי את מה שסיפרת. מכאן ואילך אני ממשיך ללמוד אותך תוך כדי תנועה.</p>
                  <p className="text-sm text-muted-foreground">אני אשתמש בזה כדי להתאים את עצמי אליך — בלי להציע פתרונות, בלי לתייג. רק לסנכרן.</p>
                </div>
                <Button
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => navigate('/')}
                  data-testid="button-go-home"
                >
                  בוא נתחיל לעבוד
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={showSkipModal} onOpenChange={setShowSkipModal}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="text-skip-title">רוצה לעצור את ההיכרות כאן?</DialogTitle>
            <DialogDescription>
              אפשר גם להתחיל לעבוד עכשיו. מה שכבר ענית נשמר, ואני אכיר את הדרך שלך תוך כדי תנועה.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              onClick={handleSkip}
              data-testid="button-confirm-skip"
            >
              מתחילים לעבוד עכשיו
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowSkipModal(false)}
              data-testid="button-continue-onboarding"
            >
              ממשיכים בהיכרות
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            אפשר לחזור להשלמת ההיכרות בכל רגע.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
