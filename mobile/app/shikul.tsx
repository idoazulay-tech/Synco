import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient, CheckInRequest } from '@/api/MAApiClient';
import QuestionBlock from '@/components/QuestionBlock';

export default function ShikulScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [questions, setQuestions] = useState<CheckInRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const feedback = await apiClient.getFeedback();
      setQuestions(feedback.pendingCheckIns || []);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת השאלות');
      console.error(err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await fetchQuestions();
    setIsLoading(false);
  }, [fetchQuestions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchQuestions();
    setIsRefreshing(false);
  }, [fetchQuestions]);

  const handleAnswer = useCallback(async (questionId: string, answer: string) => {
    try {
      await apiClient.respondToCheckIn(questionId, answer);
      // Remove answered question from list
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>טוען שאלות...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {questions.length > 0 ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {questions.length} שאלות ממתינות
              </Text>
            </View>
            {questions.map((question) => (
              <QuestionBlock
                key={question.id}
                question={question}
                onAnswer={handleAnswer}
              />
            ))}
          </>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
            <Text style={styles.emptyText}>אין שאלות ממתינות</Text>
            <Text style={styles.emptySubtext}>
              כשתהיה שאלה מ-MA, היא תופיע כאן
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
