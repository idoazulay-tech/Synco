import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface VoiceInputProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export default function VoiceInput({ onResult, onClose }: VoiceInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isListening) {
      // Pulse animation while listening
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const startListening = async () => {
    setIsListening(true);
    setError(null);
    setTranscript('');

    // MVP LIMITATION: Real speech-to-text requires native modules
    // expo-speech is TTS (text-to-speech), not STT
    // For real STT, would need @react-native-voice/voice or similar
    // This placeholder demonstrates the UI flow
    
    setTimeout(() => {
      setError('הקלטה קולית דורשת native module שלא זמין ב-Expo Go.\nהשתמש בקלט טקסט בינתיים.');
      setIsListening(false);
    }, 2000);
  };

  const stopListening = () => {
    setIsListening(false);
    if (transcript) {
      onResult(transcript);
    }
  };

  const handleConfirm = () => {
    if (transcript) {
      onResult(transcript);
    }
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '85%',
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 24,
    },
    micContainer: {
      marginBottom: 24,
    },
    micButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isListening ? colors.error : colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transcriptContainer: {
      width: '100%',
      minHeight: 80,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    transcriptText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
      lineHeight: 24,
    },
    placeholderText: {
      fontSize: 16,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: 16,
      color: colors.primaryText,
      fontWeight: '600',
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
    statusText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
  });

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>הקלטה קולית</Text>

          <View style={styles.micContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.micButton}
                onPress={isListening ? stopListening : startListening}
              >
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={48}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.statusText}>
            {isListening ? 'מקשיב...' : 'לחץ להתחלה'}
          </Text>

          <View style={styles.transcriptContainer}>
            {transcript ? (
              <Text style={styles.transcriptText}>{transcript}</Text>
            ) : (
              <Text style={styles.placeholderText}>
                הטקסט יופיע כאן...
              </Text>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !transcript && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!transcript}
            >
              <Text style={styles.confirmButtonText}>אישור</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
