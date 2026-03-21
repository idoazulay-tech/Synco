import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import apiClient, { FeedbackStats, FeedbackResponse } from '@/api/MAApiClient';

interface DailyReviewData {
  dateIso: string;
  completed: number;
  total: number;
  topBlocker?: string;
  topMust?: string;
  microStep: string;
}

export default function ReviewScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [reviewData, setReviewData] = useState<DailyReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiClient.isConfigured()) {
      setError('יש להגדיר כתובת שרת בהגדרות');
      setIsLoading(false);
      return;
    }

    try {
      const feedback = await apiClient.getFeedback(20);
      setStats(feedback.stats);

      // Check if there's a daily review in the feed
      const dailyReview = feedback.feedbackFeed.find(f => f.type === 'daily_review');
      if (dailyReview) {
        // Parse daily review data from the feedback message
        setReviewData({
          dateIso: dailyReview.tsIso,
          completed: feedback.stats.todayCompleted,
          total: feedback.stats.todayTotal,
          topBlocker: undefined, // Would be extracted from message
          topMust: undefined,
          microStep: dailyReview.microStepHebrew,
        });
      }

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

  const handleRequestReview = useCallback(async () => {
    if (!apiClient.isConfigured()) {
      setError('יש להגדיר כתובת שרת בהגדרות');
      return;
    }

    setIsRequesting(true);
    try {
      const result = await apiClient.requestDailyReview();
      if (result.success) {
        await fetchData();
      }
    } catch (err) {
      setError('שגיאה בבקשת סיכום');
      console.error(err);
    } finally {
      setIsRequesting(false);
    }
  }, [fetchData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completionRate = stats && stats.todayTotal > 0
    ? Math.round((stats.todayCompleted / stats.todayTotal) * 100)
    : 0;

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
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 8,
    },
    statsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    progressContainer: {
      marginTop: 8,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'left',
      marginTop: 4,
    },
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 16,
    },
    infoBlock: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    blockerBlock: {
      backgroundColor: colors.error + '15',
    },
    mustBlock: {
      backgroundColor: colors.primary + '15',
    },
    microStepBlock: {
      backgroundColor: '#f59e0b15',
    },
    infoBlockTitle: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
      marginBottom: 4,
    },
    blockerTitle: {
      color: colors.error,
    },
    mustTitle: {
      color: colors.primary,
    },
    microStepTitle: {
      color: '#f59e0b',
    },
    infoBlockText: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
      lineHeight: 20,
    },
    requestCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    requestButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    requestButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      marginBottom: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });

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
          <Ionicons name="calendar" size={24} color={colors.primary} />
          <Text style={styles.title}>סיכום יום</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Stats Card */}
            {stats && (
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>סטטיסטיקות היום</Text>

                <View style={styles.statsRow}>
                  <Text style={styles.statValue}>{stats.todayCompleted}</Text>
                  <Text style={styles.statLabel}>משימות הושלמו</Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statValue}>{stats.todayTotal}</Text>
                  <Text style={styles.statLabel}>סה"כ משימות</Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statValue}>{stats.weeklyAvgCompletion}%</Text>
                  <Text style={styles.statLabel}>ממוצע שבועי</Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{completionRate}% הושלם היום</Text>
                </View>
              </View>
            )}

            {/* Daily Review or Request */}
            {reviewData ? (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  סיכום - {new Date(reviewData.dateIso).toLocaleDateString('he-IL')}
                </Text>

                {reviewData.topBlocker && (
                  <View style={[styles.infoBlock, styles.blockerBlock]}>
                    <Text style={[styles.infoBlockTitle, styles.blockerTitle]}>
                      הדבר הכי תקוע
                    </Text>
                    <Text style={styles.infoBlockText}>{reviewData.topBlocker}</Text>
                  </View>
                )}

                {reviewData.topMust && (
                  <View style={[styles.infoBlock, styles.mustBlock]}>
                    <Text style={[styles.infoBlockTitle, styles.mustTitle]}>
                      המשימה הכי חשובה למחר
                    </Text>
                    <Text style={styles.infoBlockText}>{reviewData.topMust}</Text>
                  </View>
                )}

                {reviewData.microStep && (
                  <View style={[styles.infoBlock, styles.microStepBlock]}>
                    <Text style={[styles.infoBlockTitle, styles.microStepTitle]}>
                      הצעד הבא הכי קטן
                    </Text>
                    <Text style={styles.infoBlockText}>{reviewData.microStep}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.requestCard}>
                <Ionicons name="document-text-outline" size={48} color={colors.primary} />
                <Text style={styles.requestText}>
                  קבל סיכום של הפעילות שלך היום
                </Text>
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={handleRequestReview}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.requestButtonText}>תן סיכום יום</Text>
                      <Ionicons name="refresh" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
