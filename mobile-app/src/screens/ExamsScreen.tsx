import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleAPI } from '../services/api';

export default function ExamsScreen({ navigation }: any) {
  const { colors, spacing, fontSize } = useTheme();
  const [exams, setExams] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadExams = async () => {
    try {
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        setExams(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    setRefreshing(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  const renderExam = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.examCard}
      onPress={() => navigation.navigate('TakeExam', { scheduleId: item.id })}
    >
      <View style={styles.examHeader}>
        <Text style={styles.examTitle}>{item.examTitle}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'scheduled' ? colors.warning : colors.success 
        }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.examInfo}>
        Duration: {item.durationMinutes} minutes
      </Text>
      <Text style={styles.examInfo}>
        Scheduled: {new Date(item.scheduledDate).toLocaleDateString()} at {item.startTime}
      </Text>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    examCard: {
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
    examHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
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
      fontWeight: '600',
    },
    examInfo: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      marginTop: spacing.xs,
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
        data={exams}
        renderItem={renderExam}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exams scheduled</Text>
        }
      />
    </View>
  );
}
