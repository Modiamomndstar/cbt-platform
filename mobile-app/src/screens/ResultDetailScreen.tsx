import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { resultAPI, aiAPI } from '../services/api';
import { formatDate, formatTime } from '../lib/utils';
import { getImageUrl } from '../lib/imageUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';

export default function ResultDetailScreen({ route }: any) {
  const { resultId } = route.params;
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const loadDetail = useCallback(async () => {
    try {
      const response = await resultAPI.getResultDetail(resultId);
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load result detail:', error);
      Alert.alert('Error', 'Failed to load detailed result');
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const explainQuestion = async (q: any) => {
    try {
      setExplainingId(q.id);
      const response = await aiAPI.explainQuestion({
        questionId: q.id,
        studentAnswer: q.studentAnswer,
        correctAnswer: q.correctAnswer
      });

      if (response.data.success) {
        setExplanations(prev => ({ ...prev, [q.id]: response.data.data.explanation }));
      }
    } catch (error: any) {
      console.error('AI Explain failed:', error);
      if (error.response?.status === 403) {
        Alert.alert('Premium Feature', 'AI Coaching is available on Advanced and Enterprise plans.');
      } else {
        Alert.alert('Error', 'Failed to generate explanation. Please try again later.');
      }
    } finally {
      setExplainingId(null);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      backgroundColor: '#fff',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    examTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 4,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: 6,
    },
    dateText: {
      fontSize: 14,
      color: '#64748b',
    },
    statsGrid: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderRadius: 16,
      padding: spacing.md,
      gap: 12,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    statLabel: {
      fontSize: 11,
      color: '#64748b',
      marginTop: 2,
    },
    section: {
      padding: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#334155',
      marginBottom: spacing.md,
    },
    questionCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderLeftWidth: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    qHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    qNumber: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#64748b',
    },
    qScore: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    qText: {
      fontSize: 15,
      color: '#1e293b',
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    answerContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: spacing.md,
    },
    answerBox: {
      flex: 1,
      backgroundColor: '#f8fafc',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    answerLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#94a3b8',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    answerValue: {
      fontSize: 13,
      fontWeight: '700',
    },
    aiBtn: {
      backgroundColor: '#f5f3ff',
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#ddd6fe',
    },
    aiBtnText: {
      color: '#6d28d9',
      fontSize: 14,
      fontWeight: 'bold',
    },
    explanationBox: {
      backgroundColor: '#eff6ff',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    expTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: 4,
    },
    expText: {
      fontSize: 13,
      color: '#1e3a8a',
      lineHeight: 18,
    }
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!result) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.examTitle}>{result.examTitle}</Text>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748b" />
          <Text style={styles.dateText}>
            {formatDate(result.submittedAt)} at {formatTime(result.submittedAt)}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.score}/{result.totalMarks}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: result.passed ? '#10b981' : '#ef4444' }]}>
              {result.percentage}%
            </Text>
            <Text style={styles.statLabel}>Grade</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.timeSpentMinutes}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name={result.passed ? "check-circle" : "close-circle"}
              size={20}
              color={result.passed ? '#10b981' : '#ef4444'}
            />
            <Text style={styles.statLabel}>{result.passed ? 'PASSED' : 'FAILED'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Question Breakdown</Text>
        {result.questions.map((q: any, index: number) => (
          <View
            key={q.id}
            style={[styles.questionCard, { borderLeftColor: q.isCorrect ? '#10b981' : '#ef4444' }]}
          >
            <View style={styles.qHeader}>
              <Text style={styles.qNumber}>QUESTION {index + 1}</Text>
              <Text style={[styles.qScore, { color: q.isCorrect ? '#10b981' : '#ef4444' }]}>
                {q.isCorrect ? 'Correct' : 'Incorrect'} ({q.marksObtained}/{q.marks})
              </Text>
            </View>

            <Text style={styles.qText}>{q.text}</Text>

            {q.imageUrl && (
              <Image
                source={{ uri: getImageUrl(q.imageUrl) || '' }}
                style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: spacing.md }}
                resizeMode="contain"
              />
            )}

            <View style={styles.answerContainer}>
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Your Answer</Text>
                <Text style={[styles.answerValue, { color: q.isCorrect ? '#10b981' : '#ef4444' }]}>
                  {q.studentAnswer || '(None)'}
                </Text>
              </View>
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Correct Answer</Text>
                <Text style={[styles.answerValue, { color: '#10b981' }]}>
                  {q.correctAnswer}
                </Text>
              </View>
            </View>

            {explanations[q.id] ? (
              <View style={styles.explanationBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                  <MaterialCommunityIcons name="auto-fix" size={16} color="#1e40af" />
                  <Text style={styles.expTitle}>AI Explanation</Text>
                </View>
                <Text style={styles.expText}>{explanations[q.id]}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => explainQuestion(q)}
                disabled={explainingId === q.id}
              >
                {explainingId === q.id ? (
                  <ActivityIndicator size="small" color="#6d28d9" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="auto-fix" size={18} color="#6d28d9" />
                    <Text style={styles.aiBtnText}>Explain with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
