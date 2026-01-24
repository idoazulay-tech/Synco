import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import apiClient, { CheckInRequest, FeedbackMessage, FeedbackResponse, PlanOption } from '@/api/MAApiClient';

type ShikulItem = 
  | { type: 'checkin'; data: CheckInRequest }
  | { type: 'plan'; data: { id: string; plans: PlanOption[] } }
  | { type: 'feedback'; data: FeedbackMessage };

export default function ShikulScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [items, setItems] = useState<ShikulItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiClient.isConfigured()) {
      setError('יש להגדיר כתובת שרת בהגדרות');
      setIsLoading(false);
      return;
    }

    try {
      const feedback = await apiClient.getFeedback(20);
      const newItems: ShikulItem[] = [];

      // Add pending check-in first
      if (feedback.pendingCheckIn) {
        newItems.push({ type: 'checkin', data: feedback.pendingCheckIn });
      }

      // Add high-priority feedback items that need action
      feedback.feedbackFeed
        .filter(f => f.ui.priority === 'high' || f.ui.showAs === 'modal')
        .forEach(f => {
          newItems.push({ type: 'feedback', data: f });
        });

      // Add remaining feedback items
      feedback.feedbackFeed
        .filter(f => f.ui.priority !== 'high' && f.ui.showAs !== 'modal')
        .slice(0, 10)
        .forEach(f => {
          newItems.push({ type: 'feedback', data: f });
        });

      setItems(newItems);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error(err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
    setIsLoading(false);
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckInResponse = async (checkIn: CheckInRequest, response: string) => {
    setSubmitting(checkIn.id);
    try {
      await apiClient.respondToCheckIn(response, checkIn.id);
      // Remove the item and refresh
      setItems(prev => prev.filter(i => !(i.type === 'checkin' && i.data.id === checkIn.id)));
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  const handlePlanChoice = async (planId: 'A' | 'B', plans: PlanOption[]) => {
    setSubmitting(planId);
    try {
      await apiClient.confirmPlan(planId, plans);
      setItems(prev => prev.filter(i => i.type !== 'plan'));
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  const updateResponse = (id: string, text: string) => {
    setResponses(prev => ({ ...prev, [id]: text }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
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
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkInCard: {
      borderRightWidth: 4,
      borderRightColor: colors.primary,
    },
    planCard: {
      borderRightWidth: 4,
      borderRightColor: '#f59e0b',
    },
    feedbackCard: {
      borderRightWidth: 4,
    },
    feedbackHigh: {
      borderRightColor: colors.error,
    },
    feedbackMedium: {
      borderRightColor: '#f59e0b',
    },
    feedbackLow: {
      borderRightColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 8,
    },
    badgeCheckIn: {
      backgroundColor: colors.primary + '20',
    },
    badgePlan: {
      backgroundColor: '#f59e0b20',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    badgeTextCheckIn: {
      color: colors.primary,
    },
    badgeTextPlan: {
      color: '#f59e0b',
    },
    questionText: {
      fontSize: 15,
      color: colors.text,
      textAlign: 'right',
      marginBottom: 12,
      lineHeight: 22,
    },
    freeTextInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
      minHeight: 60,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    buttonTextPrimary: {
      color: '#fff',
    },
    buttonTextSecondary: {
      color: colors.text,
    },
    optionButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionButtonFirst: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionText: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.text,
    },
    optionTextFirst: {
      color: '#fff',
      fontWeight: '600',
    },
    planOption: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    planOptionSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 4,
    },
    planSummary: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
      marginBottom: 8,
    },
    planChanges: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    changeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingVertical: 4,
    },
    changeText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginRight: 8,
    },
    feedbackTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 4,
    },
    feedbackBody: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
      lineHeight: 20,
    },
    microStep: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      marginTop: 10,
    },
    microStepText: {
      fontSize: 13,
      color: colors.text,
      textAlign: 'right',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });

  const renderCheckIn = (checkIn: CheckInRequest) => (
    <View key={checkIn.id} style={[styles.itemCard, styles.checkInCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, styles.badgeCheckIn]}>
          <Text style={[styles.badgeText, styles.badgeTextCheckIn]}>שאלה</Text>
        </View>
        <Ionicons name="help-circle" size={20} color={colors.primary} />
      </View>

      <Text style={styles.questionText}>{checkIn.questionHebrew}</Text>

      {checkIn.expectedAnswerType === 'choice' && (
        <View>
          {checkIn.options.map((option, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.optionButton, idx === 0 && styles.optionButtonFirst]}
              onPress={() => handleCheckInResponse(checkIn, option)}
              disabled={submitting === checkIn.id}
            >
              {submitting === checkIn.id ? (
                <ActivityIndicator size="small" color={idx === 0 ? '#fff' : colors.primary} />
              ) : (
                <Text style={[styles.optionText, idx === 0 && styles.optionTextFirst]}>
                  {option}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {checkIn.expectedAnswerType === 'free_text' && (
        <View>
          <TextInput
            style={styles.freeTextInput}
            value={responses[checkIn.id] || ''}
            onChangeText={(text) => updateResponse(checkIn.id, text)}
            placeholder="הקלד תשובה..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => handleCheckInResponse(checkIn, responses[checkIn.id] || '')}
            disabled={!responses[checkIn.id]?.trim() || submitting === checkIn.id}
          >
            {submitting === checkIn.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>שלח</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {checkIn.expectedAnswerType === 'confirm' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => handleCheckInResponse(checkIn, 'כן')}
            disabled={submitting === checkIn.id}
          >
            {submitting === checkIn.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>כן</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => handleCheckInResponse(checkIn, 'לא')}
            disabled={submitting === checkIn.id}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>לא</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPlan = (id: string, plans: PlanOption[]) => (
    <View key={id} style={[styles.itemCard, styles.planCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, styles.badgePlan]}>
          <Text style={[styles.badgeText, styles.badgeTextPlan]}>בחירת תוכנית</Text>
        </View>
        <Ionicons name="git-branch" size={20} color="#f59e0b" />
      </View>

      <Text style={styles.questionText}>יש התנגשות בלוח הזמנים. בחר איך לפתור:</Text>

      {plans.map((plan) => (
        <TouchableOpacity
          key={plan.planId}
          style={styles.planOption}
          onPress={() => handlePlanChoice(plan.planId, plans)}
          disabled={submitting === plan.planId}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[styles.badge, styles.badgePlan]}>
              <Text style={[styles.badgeText, styles.badgeTextPlan]}>{plan.planId}</Text>
            </View>
            <Text style={styles.planTitle}>{plan.titleHebrew}</Text>
          </View>
          <Text style={styles.planSummary}>{plan.summaryHebrew}</Text>

          {plan.changes.length > 0 && (
            <View style={styles.planChanges}>
              {plan.changes.map((change, idx) => (
                <View key={idx} style={styles.changeItem}>
                  <Text style={styles.changeText}>
                    {change.details.reason || `${change.entityType} - ${change.change}`}
                  </Text>
                  <Ionicons
                    name={change.change === 'cancel' ? 'close-circle' : change.change === 'move' ? 'arrow-forward' : 'time'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFeedback = (feedback: FeedbackMessage) => (
    <View
      key={feedback.id}
      style={[
        styles.itemCard,
        styles.feedbackCard,
        feedback.ui.priority === 'high' && styles.feedbackHigh,
        feedback.ui.priority === 'medium' && styles.feedbackMedium,
        feedback.ui.priority === 'low' && styles.feedbackLow,
      ]}
    >
      <Text style={styles.feedbackTitle}>{feedback.titleHebrew}</Text>
      <Text style={styles.feedbackBody}>{feedback.bodyHebrew}</Text>
      {feedback.microStepHebrew && (
        <View style={styles.microStep}>
          <Text style={styles.microStepText}>צעד הבא: {feedback.microStepHebrew}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Ionicons name="layers" size={24} color={colors.primary} />
          <Text style={styles.title}>שיקלול</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.emptyText}>הכל מסודר! אין פריטים ממתינים</Text>
          </View>
        ) : (
          items.map((item) => {
            switch (item.type) {
              case 'checkin':
                return renderCheckIn(item.data);
              case 'plan':
                return renderPlan(item.data.id, item.data.plans);
              case 'feedback':
                return renderFeedback(item.data);
              default:
                return null;
            }
          })
        )}
      </ScrollView>
    </View>
  );
}
