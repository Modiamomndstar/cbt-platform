import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { resultAPI, aiAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import {
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';

export default function ResultsScreen({ navigation }: any) {
  const { colors, spacing, fontSize } = useTheme();
  const [results, setResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiModalVisible, setAiModalVisible] = useState(false);

  const loadResults = async () => {
    try {
      const response = await resultAPI.getMyHistory();
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleExplainResult = async (resultId: string) => {
    try {
      setAiLoading(true);
      setAiModalVisible(true);
      const response = await aiAPI.explainResult(resultId);
      if (response.data.success) {
        setAiAnalysis(response.data.data.explanation);
      }
    } catch (error: any) {
      console.error('AI Explain failed:', error);
      setAiModalVisible(false);
      if (error.response?.status === 403) {
        Alert.alert('Premium Feature', 'This feature is available on Advanced and Enterprise plans.');
      } else {
        Alert.alert('Error', 'Failed to generate AI analysis. Please try again later.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const renderResult = ({ item }: { item: any }) => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.examTitle}>{item.examTitle}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.passed ? colors.success : colors.error }
        ]}>
          <Text style={styles.statusText}>{item.passed ? 'PASSED' : 'FAILED'}</Text>
        </View>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreValue}>{item.score}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreValue}>{item.totalMarks}</Text>
          <Text style={styles.scoreLabel}>Total</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreValue}>{parseFloat(item.percentage).toFixed(1)}%</Text>
          <Text style={styles.scoreLabel}>Percentage</Text>
        </View>
      </View>

      <Text style={styles.dateText}>
        Taken on: {formatDate(item.submittedAt)}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[styles.aiButton, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('ResultDetail', { resultId: item.id })}
        >
          <Text style={[styles.aiButtonText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiButton, { flex: 1 }]}
          onPress={() => handleExplainResult(item.id)}
        >
          <Text style={styles.aiButtonText}>✨ AI Insight</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    resultCard: {
      backgroundColor: colors.surface,
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    examTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    statusText: {
      color: '#fff',
      fontSize: fontSize.sm,
      fontWeight: 'bold',
    },
    scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.md,
    },
    scoreItem: {
      alignItems: 'center',
    },
    scoreValue: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: colors.primary,
    },
    scoreLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    dateText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: spacing.xl,
      fontSize: fontSize.md,
    },
    aiButton: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      padding: spacing.sm,
      borderRadius: 8,
      alignItems: 'center',
    },
    aiButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: fontSize.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '100%',
      maxHeight: '80%',
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: spacing.md,
    },
    aiResultText: {
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.text,
    },
    closeButton: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    closeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No results found yet. Take an assessment to see your progress!</Text>
        }
      />

      <Modal
        visible={isAiModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Performance Insight</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {aiLoading ? (
                <View style={{ padding: spacing.xl }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { marginTop: spacing.md }]}>Analyzing your performance...</Text>
                </View>
              ) : (
                <Text style={styles.aiResultText}>{aiAnalysis}</Text>
              )}
            </ScrollView>

            {!aiLoading && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setAiModalVisible(false);
                  setAiAnalysis(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
