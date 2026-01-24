import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import apiClient, { AnalyzeResponse, FeedbackResponse } from '@/api/MAApiClient';
import VoiceInput from '@/components/VoiceInput';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function InputScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  // Fetch feedback feed for display
  const { data: feedbackData, refetch: refetchFeedback, isRefetching } = useQuery<FeedbackResponse>({
    queryKey: ['feedback'],
    queryFn: async () => {
      if (!apiClient.isConfigured()) {
        throw new Error('Server not configured');
      }
      return apiClient.getFeedback(5);
    },
    enabled: apiClient.isConfigured(),
    refetchInterval: 10000,
  });

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    if (!apiClient.isConfigured()) {
      setError('יש להגדיר כתובת שרת בהגדרות תחילה');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await apiClient.analyze(inputText.trim());
      setResponse(result);
      if (result.success) {
        setInputText('');
        // Refresh feedback after successful analysis
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
      }
    } catch (err) {
      setError('שגיאה בשליחה. בדוק את החיבור לשרת.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, queryClient]);

  const handleVoiceResult = useCallback((text: string) => {
    setInputText(text);
    setShowVoice(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetchFeedback();
  }, [refetchFeedback]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
      paddingHorizontal: 8,
    },
    iconButton: {
      padding: 8,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: 10,
      marginLeft: 8,
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
    },
    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'right',
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    resultLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    resultValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'left',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeExecute: {
      backgroundColor: '#22c55e20',
    },
    badgeAsk: {
      backgroundColor: '#3b82f620',
    },
    badgeReflect: {
      backgroundColor: '#f59e0b20',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    badgeTextExecute: {
      color: '#22c55e',
    },
    badgeTextAsk: {
      color: '#3b82f6',
    },
    badgeTextReflect: {
      color: '#f59e0b',
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      marginBottom: 12,
    },
    feedbackSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'right',
    },
    feedbackItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRightWidth: 4,
    },
    feedbackItemHigh: {
      borderRightColor: colors.error,
    },
    feedbackItemMedium: {
      borderRightColor: '#f59e0b',
    },
    feedbackItemLow: {
      borderRightColor: colors.border,
    },
    feedbackTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 4,
    },
    feedbackBody: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    microStep: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
    },
    microStepText: {
      fontSize: 13,
      color: colors.text,
      textAlign: 'right',
    },
    emptyState: {
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: 20,
    },
    questionCard: {
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    questionText: {
      fontSize: 15,
      color: colors.text,
      textAlign: 'right',
      marginBottom: 12,
    },
    reflectionCard: {
      backgroundColor: '#f59e0b15',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#f59e0b',
    },
    reflectionText: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
    },
  });

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'execute':
        return { style: styles.badgeExecute, textStyle: styles.badgeTextExecute, label: 'ביצוע' };
      case 'ask':
        return { style: styles.badgeAsk, textStyle: styles.badgeTextAsk, label: 'שאלה' };
      case 'reflect':
        return { style: styles.badgeReflect, textStyle: styles.badgeTextReflect, label: 'שיקוף' };
      default:
        return { style: styles.badgeReflect, textStyle: styles.badgeTextReflect, label: decision };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
          <Text style={styles.title}>MA - המפרקט</Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowVoice(true)}
          >
            <Ionicons name="mic" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="מה אתה רוצה לעשות?"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Analysis Results */}
        {response?.success && response.intent && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>תוצאות ניתוח</Text>

            <View style={styles.resultRow}>
              <View style={[styles.badge, getDecisionBadge(response.decision?.decision || '').style]}>
                <Text style={[styles.badgeText, getDecisionBadge(response.decision?.decision || '').textStyle]}>
                  {getDecisionBadge(response.decision?.decision || '').label}
                </Text>
              </View>
              <Text style={styles.resultLabel}>החלטה</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultValue}>{response.intent.primaryIntent}</Text>
              <Text style={styles.resultLabel}>כוונה</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultValue}>{Math.round(response.intent.confidence * 100)}%</Text>
              <Text style={styles.resultLabel}>ביטחון</Text>
            </View>

            {response.intent.entities.title && (
              <View style={styles.resultRow}>
                <Text style={styles.resultValue}>{response.intent.entities.title}</Text>
                <Text style={styles.resultLabel}>כותרת</Text>
              </View>
            )}

            {response.intent.entities.time && (
              <View style={styles.resultRow}>
                <Text style={styles.resultValue}>{response.intent.entities.time}</Text>
                <Text style={styles.resultLabel}>שעה</Text>
              </View>
            )}

            {response.intent.entities.duration && (
              <View style={styles.resultRow}>
                <Text style={styles.resultValue}>{response.intent.entities.duration} דקות</Text>
                <Text style={styles.resultLabel}>משך</Text>
              </View>
            )}
          </View>
        )}

        {/* Question from MA */}
        {response?.decision?.question?.shouldAsk && (
          <View style={styles.questionCard}>
            <Text style={styles.resultTitle}>שאלה מ-MA</Text>
            <Text style={styles.questionText}>{response.decision.question.text}</Text>
          </View>
        )}

        {/* Reflection from MA */}
        {response?.decision?.reflection?.shouldReflect && (
          <View style={styles.reflectionCard}>
            <Text style={styles.resultTitle}>שיקוף</Text>
            <Text style={styles.reflectionText}>{response.decision.reflection.text}</Text>
            {response.decision.reflection.microStep && (
              <View style={styles.microStep}>
                <Text style={styles.microStepText}>
                  צעד הבא: {response.decision.reflection.microStep}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Feedback */}
        {feedbackData && feedbackData.feedbackFeed.length > 0 && (
          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>עדכונים אחרונים</Text>
            {feedbackData.feedbackFeed.slice(0, 3).map((item) => (
              <View
                key={item.id}
                style={[
                  styles.feedbackItem,
                  item.ui.priority === 'high' && styles.feedbackItemHigh,
                  item.ui.priority === 'medium' && styles.feedbackItemMedium,
                  item.ui.priority === 'low' && styles.feedbackItemLow,
                ]}
              >
                <Text style={styles.feedbackTitle}>{item.titleHebrew}</Text>
                <Text style={styles.feedbackBody}>{item.bodyHebrew}</Text>
                {item.microStepHebrew && (
                  <View style={styles.microStep}>
                    <Text style={styles.microStepText}>צעד הבא: {item.microStepHebrew}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <VoiceInput
        visible={showVoice}
        onClose={() => setShowVoice(false)}
        onResult={handleVoiceResult}
      />
    </View>
  );
}
