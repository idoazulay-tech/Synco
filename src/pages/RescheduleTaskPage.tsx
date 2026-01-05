import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Tag, ChevronLeft } from 'lucide-react';
import { format, setHours, setMinutes, startOfDay, differenceInMinutes, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeWheelPicker } from '@/components/ui/time-wheel-picker';
import { DurationPresets } from '@/components/ui/duration-presets';
import { useTaskStore } from '@/store/taskStore';
import { useToast } from '@/hooks/use-toast';
import { CompactSchedule, ScheduleToggle } from '@/components/layout/CompactSchedule';

const RescheduleTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTaskById, updateTask } = useTaskStore();
  const { toast } = useToast();
  const task = id ? getTaskById(id) : undefined;

  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (task) {
      setSelectedDate(format(task.startTime, 'yyyy-MM-dd'));
      setStartHour(task.startTime.getHours());
      setStartMinute(task.startTime.getMinutes());
      setDurationMinutes(differenceInMinutes(task.endTime, task.startTime));
    }
  }, [task]);

  const endTime = useMemo(() => {
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    let endHour = Math.floor(totalMinutes / 60);
    let endMinute = totalMinutes % 60;
    
    if (endHour > 23) {
      endHour = 23;
      endMinute = 59;
    }
    
    return { hour: endHour, minute: endMinute };
  }, [startHour, startMinute, durationMinutes]);

  const actualDurationMinutes = useMemo(() => {
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endTime.hour * 60 + endTime.minute;
    return Math.max(1, endTotal - startTotal);
  }, [startHour, startMinute, endTime]);

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleStartTimeChange = (hour: number, minute: number) => {
    setStartHour(hour);
    setStartMinute(minute);
  };

  const handleEndTimeChange = (hour: number, minute: number) => {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = hour * 60 + minute;
    const newDuration = endTotalMinutes - startTotalMinutes;
    
    if (newDuration > 0) {
      setDurationMinutes(newDuration);
    }
  };

  const handleDurationSelect = (minutes: number) => {
    setDurationMinutes(minutes);
  };

  const handleSubmit = () => {
    if (!task) return;

    const taskDate = new Date(selectedDate);
    const taskStartTime = setMinutes(setHours(startOfDay(taskDate), startHour), startMinute);
    const taskEndTime = setMinutes(setHours(startOfDay(taskDate), endTime.hour), endTime.minute);

    updateTask(task.id, {
      startTime: taskStartTime,
      endTime: taskEndTime,
      duration: actualDurationMinutes,
      status: 'pending',
    });

    toast({
      title: 'המשימה הוזזה',
      description: `"${task.title}" הוזזה ל-${format(taskStartTime, 'EEEE d/M בשעה HH:mm', { locale: he })}`,
    });

    navigate('/');
  };

  if (!task) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">משימה לא נמצאה</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <div className="min-h-screen flex flex-col">
        <ScheduleToggle onClick={() => setShowSchedule(true)} />

        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg font-bold">הזז קדימה</h1>
            
            <div className="w-10" />
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <h2 className="text-xl font-bold mb-2">{task.title}</h2>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {task.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{task.location}</span>
                </div>
              )}
              {task.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>{task.tags.map(t => t.name).join(', ')}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">בחר תאריך ושעה חדשים</span>
            </div>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="input-reschedule-date"
            />
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className={selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'ring-2 ring-primary' : ''}
                data-testid="button-today"
              >
                היום
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                className={selectedDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'ring-2 ring-primary' : ''}
                data-testid="button-tomorrow"
              >
                מחר
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(format(addDays(new Date(), 2), 'yyyy-MM-dd'))}
                className={selectedDate === format(addDays(new Date(), 2), 'yyyy-MM-dd') ? 'ring-2 ring-primary' : ''}
                data-testid="button-day-after"
              >
                מחרתיים
              </Button>
            </div>
            
            <div className="space-y-4 bg-muted/30 rounded-lg p-4" dir="rtl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">התחלה:</div>
                  <Button
                    variant="outline"
                    className="w-full text-2xl font-bold h-14"
                    onClick={() => setShowStartPicker(true)}
                    data-testid="button-start-time"
                  >
                    {formatTime(startHour, startMinute)}
                  </Button>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">סיום:</div>
                  <Button
                    variant="outline"
                    className="w-full text-2xl font-bold h-14"
                    onClick={() => setShowEndPicker(true)}
                    data-testid="button-end-time"
                  >
                    {formatTime(endTime.hour, endTime.minute)}
                  </Button>
                </div>
              </div>
              
              <DurationPresets
                selectedDuration={durationMinutes}
                onDurationSelect={handleDurationSelect}
              />
            </div>
          </motion.div>
        </div>

        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button 
            size="lg" 
            onClick={handleSubmit}
            className="w-full max-w-lg mx-auto block"
            data-testid="button-confirm-reschedule"
          >
            הזז משימה
          </Button>
        </div>

        <CompactSchedule 
          isOpen={showSchedule} 
          onClose={() => setShowSchedule(false)}
          currentTaskId={task.id}
        />
      </div>

      <TimeWheelPicker
        open={showStartPicker}
        onOpenChange={setShowStartPicker}
        hour={startHour}
        minute={startMinute}
        onTimeChange={handleStartTimeChange}
        title="שעת התחלה"
      />
      
      <TimeWheelPicker
        open={showEndPicker}
        onOpenChange={setShowEndPicker}
        hour={endTime.hour}
        minute={endTime.minute}
        onTimeChange={handleEndTimeChange}
        title="שעת סיום"
      />
    </AppLayout>
  );
};

export default RescheduleTaskPage;
