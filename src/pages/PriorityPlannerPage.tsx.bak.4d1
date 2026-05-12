import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Loader2,
  ChevronLeft, Clock, Calendar, Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { usePlanningDraftStore } from '@/store/planningDraftStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlanningDraftPanel } from '@/components/planner/PlanningDraftPanel';

type PlannerStep = 'input' | 'analyzing' | 'done';

export default function PriorityPlannerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getTasksForDay } = useTaskStore();
  const {
    addDraftTasks,
    hasUnconfirmedDrafts,
    draftTasks,
  } = usePlanningDraftStore();

  const [step, setStep]           = useState<PlannerStep>('input');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening]   = useState(false);
  const [liveInterim, setLiveInterim]   = useState('');
  const [isParsing, setIsParsing]       = useState(false);

  const recognitionRef  = useRef<any>(null);
  const sessionFinalRef = useRef('');

  const today        = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE, d בMMMM', { locale: he });

  const existingTasks = getTasksForDay(new Date()).map(t => ({
    title: t.title,
    hour:  new Date(t.startTime).getHours(),
    minute: new Date(t.startTime).getMinutes(),
    duration: t.duration,
  }));

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'זיהוי קולי לא נתמך בדפדפן זה', variant: 'destructive' });
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    sessionFinalRef.current = '';
    setLiveInterim('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      sessionFinalRef.current = finalText;
      setLiveInterim(finalText + interimText);
    };

    recognition.onend = () => {
      setIsListening(false);
      const addition = sessionFinalRef.current.trim();
      if (addition) {
        setInputText(prev => {
          const prefix = prev.trim();
          return prefix ? `${prefix} ${addition}` : addition;
        });
      }
      setLiveInterim('');
      sessionFinalRef.current = '';
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        setIsListening(false);
        setLiveInterim('');
        toast({ title: 'שגיאה בהקלטה', variant: 'destructive' });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [toast]);

  // Parse text and add results to the draft store
  const parseAndAddToDrafts = async (text: string) => {
    if (!text.trim()) return;
    if (isListening) stopListening();
    setIsParsing(true);

    try {
      const res = await fetch('/api/planner/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, todayDate: today, existingTasks }),
      });

      if (!res.ok) throw new Error('שגיאת שרת');
      const data = await res.json();

      if (!data.tasks || data.tasks.length === 0) {
        toast({ title: 'לא נמצאו משימות בטקסט', variant: 'destructive' });
        return;
      }

      // Stage 2.5א: add to draft store (not create UserTasks yet)
      const newDrafts = data.tasks.map((t: any) => ({
        title:          t.title || 'משימה ללא שם',
        durationMinutes: t.duration || 30,
        priority:       t.priority || 'medium',
        flexibility:    t.flexibility || 'flexible',
        dateIso:        t.date || today,
        startTime:      t.hour != null ? `${String(t.hour).padStart(2, '0')}:${String(t.minute ?? 0).padStart(2, '0')}` : undefined,
        notes:          t.notes || undefined,
        location:       t.location || undefined,
        source:         'ai_parse' as const,
        rawInput:       text,
      }));

      addDraftTasks(newDrafts);
      toast({ title: `נוספו ${newDrafts.length} משימות לרשימה` });
    } catch {
      toast({ title: 'שגיאה בניתוח', description: 'נסה שנית', variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  const analyzeInput = async () => {
    if (!inputText.trim()) return;
    setStep('analyzing');
    await parseAndAddToDrafts(inputText);
    setInputText('');
    setStep('input');
  };

  const hasDrafts = draftTasks.length > 0;

  return (
    <AppLayout
      title="תכנון יום חכם"
      rightAction={
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      }
    >
      <div className="max-w-lg mx-auto pb-28 px-4">
        <AnimatePresence mode="wait">

          {/* ────────── Step: Input ────────── */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4 pt-4"
            >
              <div className="text-center space-y-1 pb-2">
                <p className="text-2xl">🧠</p>
                <h2 className="text-lg font-bold">ספר לסינקו מה יש לך היום</h2>
                <p className="text-sm text-muted-foreground">{todayDisplay}</p>
                {existingTasks.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    יש לך {existingTasks.length} משימות ביומן
                  </p>
                )}
              </div>

              {/* Text input */}
              <div className="relative">
                <Textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`לדוגמה:\n"יש לי פגישה עם לקוח ב-10 לשעה וחצי, אחרי זה צריך לשלוח את הדוח, ואחה"צ לאסוף את הילדים ב-4"`}
                  className="min-h-[120px] text-sm resize-none pl-12"
                  dir="rtl"
                  data-testid="planner-input"
                  disabled={isParsing}
                />
                <button
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={cn(
                    'absolute bottom-3 left-3 p-2 rounded-full transition-all',
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  )}
                  data-testid="planner-voice-btn"
                  title={isListening ? 'לחץ להפסיק הקלטה' : 'לחץ להתחיל הקלטה'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {isListening && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <span>מקשיב... לחץ על המיקרופון לעצירה</span>
                  </div>
                  {liveInterim && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-sm text-primary italic px-1" dir="rtl">
                      {liveInterim}
                    </motion.p>
                  )}
                </motion.div>
              )}

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={analyzeInput}
                disabled={!inputText.trim() || isParsing}
                data-testid="planner-analyze-btn"
              >
                {isParsing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />מנתח...</>
                  : <><Zap className="w-4 h-4" />{hasDrafts ? 'נתח והוסף לרשימה' : 'נתח ותכנן'}</>
                }
              </Button>

              {/* Existing tasks in calendar today */}
              {existingTasks.length > 0 && !hasDrafts && (
                <Card className="p-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">ביומן שלך היום:</p>
                  <div className="space-y-1">
                    {existingTasks.slice(0, 4).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {String(t.hour).padStart(2, '0')}:{String(t.minute).padStart(2, '0')}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {existingTasks.length > 4 && (
                      <p className="text-xs text-muted-foreground">ועוד {existingTasks.length - 4}...</p>
                    )}
                  </div>
                </Card>
              )}

              {/* Stage 2.5א: Draft panel — shown when there are pending drafts */}
              <PlanningDraftPanel
                onDone={() => setStep('done')}
                onParseText={parseAndAddToDrafts}
                isParsing={isParsing}
              />
            </motion.div>
          )}

          {/* ────────── Step: Analyzing ────────── */}
          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">🧠</span>
                </div>
                <Loader2 className="absolute -inset-1 w-[72px] h-[72px] text-primary animate-spin opacity-40" />
              </div>
              <p className="text-base font-semibold">סינקו מנתח את המשימות...</p>
              <p className="text-sm text-muted-foreground">זה ייקח שנייה</p>
            </motion.div>
          )}

          {/* ────────── Step: Done ────────── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-4xl">
                ✅
              </div>
              <h2 className="text-xl font-bold">המשימות שובצו בהצלחה!</h2>
              <p className="text-sm text-muted-foreground">תוכל לראות אותן בתצוגת היום</p>
              <div className="flex gap-3 mt-2">
                <Button onClick={() => navigate('/day')} className="gap-2">
                  <Calendar className="w-4 h-4" />
                  לתצוגת היום
                </Button>
                <Button variant="outline" onClick={() => {
                  setStep('input');
                  setInputText('');
                }}>
                  תכנון נוסף
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
