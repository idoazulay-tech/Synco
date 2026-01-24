import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '@/api/MAApiClient';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [serverUrl, setServerUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const testConnection = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('שגיאה', 'הזן כתובת שרת');
      return;
    }

    setIsTesting(true);
    apiClient.setBaseUrl(serverUrl.trim());

    try {
      await apiClient.getState();
      setIsConnected(true);
      Alert.alert('הצלחה', 'החיבור לשרת תקין!');
    } catch (err) {
      setIsConnected(false);
      Alert.alert('שגיאה', 'לא ניתן להתחבר לשרת. בדוק את הכתובת.');
    } finally {
      setIsTesting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'right',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'right',
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'left', // URLs are LTR even in RTL apps
      writingDirection: 'ltr', // Force LTR for URL input
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: '600',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
    },
    statusText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoCard: {
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '30',
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
      lineHeight: 22,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>חיבור לשרת</Text>
          <View style={styles.card}>
            <Text style={styles.label}>כתובת השרת</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://your-replit-url.replit.dev"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={testConnection}
              disabled={isTesting}
            >
              <Text style={styles.buttonText}>
                {isTesting ? 'בודק...' : 'בדוק חיבור'}
              </Text>
              <Ionicons name="wifi" size={20} color={colors.primaryText} />
            </TouchableOpacity>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {isConnected ? 'מחובר' : 'לא מחובר'}
              </Text>
              <Ionicons
                name={isConnected ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isConnected ? colors.success : colors.textTertiary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>איך להשתמש</Text>
          <View style={[styles.card, styles.infoCard]}>
            <Text style={styles.infoText}>
              1. העתק את כתובת השרת מ-Replit{'\n'}
              2. הדבק בשדה למעלה ולחץ "בדוק חיבור"{'\n'}
              3. במסך "קלט" - הקלד או הקלט הודעה{'\n'}
              4. במסך "שיקלול" - ראה שאלות ממתינות מ-MA
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
