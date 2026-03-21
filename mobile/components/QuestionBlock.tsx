import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CheckInRequest } from '@/api/MAApiClient';

interface QuestionBlockProps {
  question: CheckInRequest;
  onAnswer: (questionId: string, answer: string) => Promise<void>;
}

export default function QuestionBlock({ question, onAnswer }: QuestionBlockProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = async (answer: string) => {
    setIsSubmitting(true);
    try {
      await onAnswer(question.id, answer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFreeText = () => {
    if (freeText.trim()) {
      handleAnswer(freeText.trim());
    }
  };

  const getReasonIcon = () => {
    switch (question.reason) {
      case 'duration_mismatch':
        return 'time-outline';
      case 'wrong_intent':
        return 'help-circle-outline';
      case 'stress_signal':
        return 'heart-outline';
      case 'automation_failed':
        return 'alert-circle-outline';
      default:
        return 'chatbubble-outline';
    }
  };

  const isYesNo = question.expectedAnswerType === 'confirm' || 
    (question.options.length === 2 && 
     question.options.some(o => o === 'כן' || o === 'yes') &&
     question.options.some(o => o === 'לא' || o === 'no'));

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    questionContainer: {
      flex: 1,
    },
    questionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      lineHeight: 24,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'right',
      marginTop: 4,
    },
    freeTextContainer: {
      marginBottom: 12,
    },
    textInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 60,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    yesNoContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    yesButton: {
      flex: 1,
      backgroundColor: colors.success,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    noButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    yesButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    noButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    optionButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    optionButtonText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: '600',
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: '600',
    },
    voiceButton: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      {/* Row 1: Question text - fixed position */}
      <View style={styles.header}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question.questionHebrew}</Text>
          <Text style={styles.timestamp}>
            {new Date(question.tsIso).toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name={getReasonIcon() as any} size={20} color={colors.primary} />
        </View>
      </View>

      {/* Row 2: Free text field - fixed position, always shown for spacing */}
      <View style={styles.freeTextContainer}>
        <TextInput
          style={styles.textInput}
          value={freeText}
          onChangeText={setFreeText}
          placeholder="או הקלד תשובה חופשית..."
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          editable={!isSubmitting}
        />
      </View>

      {/* Row 3: Buttons area - fixed position */}
      {isYesNo && (
        <View style={styles.yesNoContainer}>
          <TouchableOpacity
            style={styles.noButton}
            onPress={() => handleAnswer('לא')}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Text style={styles.noButtonText}>לא</Text>
                <Ionicons name="close" size={18} color={colors.text} />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.yesButton}
            onPress={() => handleAnswer('כן')}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.yesButtonText}>כן</Text>
                <Ionicons name="checkmark" size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!isYesNo && question.options.length > 0 && (
        <View style={[styles.buttonsContainer, { marginBottom: 8 }]}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
              disabled={isSubmitting}
            >
              <Text style={styles.optionButtonText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!freeText.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmitFreeText}
          disabled={!freeText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <>
              <Text style={styles.sendButtonText}>שלח</Text>
              <Ionicons name="send" size={16} color={colors.primaryText} />
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.voiceButton} disabled={isSubmitting}>
          <Ionicons name="mic" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
