import React, { useEffect, useState } from 'react';
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

export default function ResultDetailScreen({ route }: any) {
  const { resultId } = route.params;
  const { colors, spacing, fontSize } = useTheme();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
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
  };

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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!result) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.examTitle}>{result.examTitle}</Text>
        <Text style={styles.dateText}>
          {formatDate(result.submittedAt)} at {formatTime(result.submittedAt)}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.score} / {result.totalMarks}</Text>
            <Text style={styles.statLabel}>Marks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: result.passed ? colors.success : colors.error }]}>
              {result.percentage}%
            </Text>
            <Text style={styles.statLabel}>Percentage</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.timeSpentMinutes}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statBox}>
             <Text style={[styles.statValue, { color: result.passed ? colors.success : colors.error }]}>
              {result.passed ? 'PASS' : 'FAIL'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      <View style={styles.questionsList}>
        <Text style={styles.sectionTitle}>Question Breakdown</Text>
        {result.questions.map((q: any, index: number) => (
          <View
            key={q.id}
            style={[
              styles.questionCard,
              { borderLeftColor: q.isCorrect ? colors.success : colors.error }
            ]}
          >
            <View style={styles.qHeader}>
              <Text style={styles.qNumber}>Question {index + 1}</Text>
              <Text style={[styles.qStatus, { color: q.isCorrect ? colors.success : colors.error }]}>
                {q.isCorrect ? 'Correct' : 'Incorrect'} ({q.marksObtained}/{q.marks})
              </Text>
            </View>

            <Text style={styles.qText}>{q.text}</Text>

            <View style={styles.answerRow}>
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Your Answer</Text>
                <Text style={[styles.answerValue, { color: q.isCorrect ? colors.success : colors.error }]}>
                  {q.studentAnswer || '(No Answer)'}
                </Text>
              </View>
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Correct Answer</Text>
                <Text style={[styles.answerValue, { color: colors.success }]}>
                  {q.correctAnswer}
                </Text>
              </View>
            </View>

            {explanations[q.id] ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>✨ AI Explanation</Text>
                <Text style={styles.explanationText}>{explanations[q.id]}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.aiButton}
                onPress={() => explainQuestion(q)}
                disabled={explainingId === q.id}
              >
                {explainingId === q.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.aiButtonText}>✨ Ask AI Coach</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  examTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  questionsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  qStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  qText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 16,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  answerBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  answerValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiButton: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  explanationBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 20,
  },
});
