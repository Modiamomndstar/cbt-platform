import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { resultAPI, aiAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ResultsScreen({ navigation }: any) {
  const { colors, spacing } = useTheme();
  const [results, setResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiModalVisible, setAiModalVisible] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      const response = await resultAPI.getMyHistory();
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

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
      <View style={styles.cardHeader}>
        <View style={styles.headerTitle}>
          <Text style={styles.examTitle}>{item.examTitle}</Text>
          <Text style={styles.dateText}>{formatDate(item.submittedAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.passed ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.statusText, { color: item.passed ? '#16a34a' : '#ef4444' }]}>
            {item.passed ? 'PASSED' : 'FAILED'}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreStat}>
          <Text style={styles.scoreValue}>{item.score}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreStat}>
          <Text style={styles.scoreValue}>{item.totalMarks}</Text>
          <Text style={styles.scoreLabel}>Total</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreStat}>
          <Text style={[styles.scoreValue, { color: '#4f46e5' }]}>
            {parseFloat(item.percentage).toFixed(0)}%
          </Text>
          <Text style={styles.scoreLabel}>Grade</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('ResultDetail', { resultId: item.id })}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => handleExplainResult(item.id)}
        >
          <MaterialCommunityIcons name="auto-fix" size={16} color="#fff" />
          <Text style={styles.aiBtnText}>AI Insight</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    listContent: {
      padding: spacing.md,
    },
    resultCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    headerTitle: {
      flex: 1,
    },
    examTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    dateText: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    scoreRow: {
      flexDirection: 'row',
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    scoreStat: {
      flex: 1,
      alignItems: 'center',
    },
    scoreValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    scoreLabel: {
      fontSize: 11,
      color: '#64748b',
      marginTop: 2,
    },
    scoreDivider: {
      width: 1,
      height: 20,
      backgroundColor: '#e2e8f0',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    detailsBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailsBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#475569',
    },
    aiBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: '#4f46e5',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    aiBtnText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#fff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '100%',
      maxHeight: '80%',
      padding: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      gap: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#4f46e5',
    },
    aiText: {
      fontSize: 14,
      lineHeight: 22,
      color: '#334155',
    },
    closeBtn: {
      marginTop: spacing.lg,
      backgroundColor: '#f1f5f9',
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    closeBtnText: {
      fontWeight: 'bold',
      color: '#475569',
    }
  });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <MaterialCommunityIcons name="history" size={64} color="#e2e8f0" />
            <Text style={{ color: '#94a3b8', marginTop: 12 }}>No test history available</Text>
          </View>
        }
      />

      <Modal
        visible={isAiModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="auto-fix" size={24} color="#4f46e5" />
              <Text style={styles.modalTitle}>Performance AI Insight</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {aiLoading ? (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator color="#4f46e5" />
                  <Text style={{ marginTop: 12, color: '#64748b' }}>Consulting AI Coach...</Text>
                </View>
              ) : (
                <Text style={styles.aiText}>{aiAnalysis}</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAiModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
