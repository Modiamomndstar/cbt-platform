import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { resultAPI } from '../services/api';

export default function ResultsScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const [results, setResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
        Taken on: {new Date(item.submittedAt).toLocaleDateString()}
      </Text>
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
          <Text style={styles.emptyText}>No exam results yet</Text>
        }
      />
    </View>
  );
}
