import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getZoneForPercentage, getRandomMessage } from '@/lib/focusMessages';

interface FocusMessageOverlayProps {
  percentage: number;
}

export function FocusMessageOverlay({ percentage }: FocusMessageOverlayProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [displayedZoneId, setDisplayedZoneId] = useState<number | null>(null);
  const maxZoneReachedRef = useRef<number>(0);

  useEffect(() => {
    const zone = getZoneForPercentage(percentage);
    
    if (zone.id > maxZoneReachedRef.current) {
      maxZoneReachedRef.current = zone.id;
      setDisplayedZoneId(zone.id);
      setCurrentMessage(getRandomMessage(zone));
    } else if (displayedZoneId === null) {
      setDisplayedZoneId(zone.id);
      setCurrentMessage(getRandomMessage(zone));
      maxZoneReachedRef.current = zone.id;
    }
  }, [percentage, displayedZoneId]);

  if (!currentMessage) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayedZoneId}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="w-full text-center px-4 py-3"
        data-testid="focus-message-overlay"
      >
        <p 
          className="text-sm font-medium text-primary/80 leading-relaxed"
          data-testid="focus-message-text"
        >
          {currentMessage}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
