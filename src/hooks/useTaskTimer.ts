import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types/task';
import { differenceInSeconds, intervalToDuration } from 'date-fns';

interface TimerState {
  percentage: number;
  remainingTime: string;
  remainingSeconds: number;
  isUrgent: boolean;
  isWarning: boolean;
  shouldShowDialog10: boolean;
  shouldShowDialog5: boolean;
  shouldShowFinalDialog: boolean;
}

export const useTaskTimer = (task: Task | null) => {
  const [state, setState] = useState<TimerState>({
    percentage: 100,
    remainingTime: '--:--',
    remainingSeconds: 0,
    isUrgent: false,
    isWarning: false,
    shouldShowDialog10: false,
    shouldShowDialog5: false,
    shouldShowFinalDialog: false,
  });

  const [dialog10Shown, setDialog10Shown] = useState(false);
  const [dialog5Shown, setDialog5Shown] = useState(false);

  const resetDialogStates = useCallback(() => {
    setDialog10Shown(false);
    setDialog5Shown(false);
  }, []);

  const dismissDialog10 = useCallback(() => {
    setDialog10Shown(true);
    setState(prev => ({ ...prev, shouldShowDialog10: false }));
  }, []);

  const dismissDialog5 = useCallback(() => {
    setDialog5Shown(true);
    setState(prev => ({ ...prev, shouldShowDialog5: false }));
  }, []);

  const dismissFinalDialog = useCallback(() => {
    setState(prev => ({ ...prev, shouldShowFinalDialog: false }));
  }, []);

  useEffect(() => {
    if (!task) {
      setState({
        percentage: 0,
        remainingTime: '--:--',
        remainingSeconds: 0,
        isUrgent: false,
        isWarning: false,
        shouldShowDialog10: false,
        shouldShowDialog5: false,
        shouldShowFinalDialog: false,
      });
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const totalDuration = differenceInSeconds(task.endTime, task.startTime);
      const elapsed = differenceInSeconds(now, task.startTime);
      const remaining = Math.max(0, totalDuration - elapsed);
      
      // If task hasn't started yet, show 100%
      if (now < task.startTime) {
        setState({
          percentage: 100,
          remainingTime: formatDuration(totalDuration),
          remainingSeconds: totalDuration,
          isUrgent: false,
          isWarning: false,
          shouldShowDialog10: false,
          shouldShowDialog5: false,
          shouldShowFinalDialog: false,
        });
        return;
      }
      
      // If task has ended, show 0% and stop
      if (now > task.endTime) {
        setState({
          percentage: 0,
          remainingTime: '0:00',
          remainingSeconds: 0,
          isUrgent: true,
          isWarning: false,
          shouldShowDialog10: false,
          shouldShowDialog5: false,
          shouldShowFinalDialog: true,
        });
        return;
      }
      
      const percentage = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
      const remainingTime = formatDuration(remaining);

      // Dialog logic
      const shouldShowDialog10 = percentage <= 10 && percentage > 5 && !dialog10Shown;
      const shouldShowDialog5 = percentage <= 5 && percentage > 0 && !dialog5Shown && dialog10Shown;
      const shouldShowFinalDialog = percentage === 0 && remaining === 0;

      setState({
        percentage,
        remainingTime,
        remainingSeconds: remaining,
        isUrgent: percentage <= 10,
        isWarning: percentage <= 25 && percentage > 10,
        shouldShowDialog10,
        shouldShowDialog5,
        shouldShowFinalDialog,
      });
    };
    
    const formatDuration = (seconds: number): string => {
      const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
      const hours = duration.hours || 0;
      const minutes = duration.minutes || 0;
      const secs = duration.seconds || 0;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [task, dialog10Shown, dialog5Shown]);

  return {
    ...state,
    resetDialogStates,
    dismissDialog10,
    dismissDialog5,
    dismissFinalDialog,
  };
};
