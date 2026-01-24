import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient, AnalyzeResponse } from '@/api/MAApiClient';
import VoiceInput from '@/components/VoiceInput';

export default function InputScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await apiClient.analyze(inputText.trim());
      setResponse(result);
      if (result.success) {
        setInputText('');
      }
    } catch (err) {
      setError('שגיאה בשליחה. בדוק את החיבור לשרת.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  const handleVoiceResult = useCallback((text: string) => {
    setInputText(text);
    setShowVoice(false);
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 16,
    },
    textInput: {
      flex: 1,
      minHeight: 48,
      maxHeight: 120,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    micButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    responseContainer: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'right',
    },
    cardText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
      lineHeight: 24,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      padding: 16,
    },
    questionCard: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
    },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
    },
    placeholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 16,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {response ? (
          <View style={styles.responseContainer}>
            {response.decision?.question && (
              <View style={[styles.card, styles.questionCard]}>
                <Text style={styles.cardTitle}>שאלה מ-MA</Text>
                <Text style={styles.questionText}>{response.decision.question}</Text>
              </View>
            )}

            {response.analysis && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>ניתוח</Text>
                <Text style={styles.cardText}>
                  כוונה: {response.analysis.primaryIntent}
                </Text>
                <Text style={styles.cardText}>
                  סוג: {response.analysis.inputType}
                </Text>
                <Text style={styles.cardText}>
                  ביטחון: {Math.round(response.analysis.confidence * 100)}%
                </Text>
              </View>
            )}

            {response.decision && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>החלטה</Text>
                <Text style={styles.cardText}>
                  פעולה: {response.decision.action}
                </Text>
                <Text style={styles.cardText}>
                  סיבה: {response.decision.reason}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.placeholderText}>
              הקלד או הקלט משהו...{'\n'}
              למשל: "קבע לי פגישה מחר ב-2"
            </Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={{ padding: 16, backgroundColor: colors.background }}>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSend}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Ionicons name="send" size={20} color={colors.primaryText} />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="הקלד משהו..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.button, styles.micButton]}
            onPress={() => setShowVoice(true)}
          >
            <Ionicons name="mic" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {showVoice && (
        <VoiceInput
          onResult={handleVoiceResult}
          onClose={() => setShowVoice(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
