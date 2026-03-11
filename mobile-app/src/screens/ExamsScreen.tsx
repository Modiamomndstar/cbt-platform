import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleAPI } from '../services/api';
import { formatDate, getExamLabel } from '../lib/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ExamsScreen({ navigation }: any) {
  const { colors, spacing } = useTheme();
  const [exams, setExams] = useState<any[]>([]);
  const [filteredExams, setFilteredExams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExams = useCallback(async () => {
    try {
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        setExams(response.data.data);
        setFilteredExams(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    const filtered = exams.filter(exam =>
      exam.examTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredExams(filtered);
  }, [searchQuery, exams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    setRefreshing(false);
  };

  const renderExam = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.examCard}
      onPress={() => navigation.navigate('TakeExam', { scheduleId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.examTitle}>{item.examTitle}</Text>
          <Text style={styles.categoryText}>{item.categoryName || 'General Assessment'}</Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === 'scheduled' ? '#fef3c7' : '#dcfce7'
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === 'scheduled' ? '#d97706' : '#16a34a'
          }]}>
            {item.status === 'scheduled' ? 'Coming Soon' : 'Available'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.durationMinutes} mins</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748b" />
          <Text style={styles.detailText}>{formatDate(item.scheduledDate)}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="help-circle-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.questionCount || 0} Questions</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.typeTag, { backgroundColor: item.isCompetition ? '#fce7f3' : '#e0e7ff' }]}>
          <Text style={[styles.typeTagText, { color: item.isCompetition ? '#db2777' : '#4f46e5' }]}>
            {getExamLabel(!!item.isCompetition)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      padding: spacing.md,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      height: 45,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: 14,
      color: '#1e293b',
    },
    listContent: {
      padding: spacing.md,
    },
    examCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      marginBottom: spacing.md,
      padding: spacing.md,
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
    },
    titleContainer: {
      flex: 1,
    },
    examTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    categoryText: {
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
      fontSize: 11,
      fontWeight: 'bold',
    },
    divider: {
      height: 1,
      backgroundColor: '#f1f5f9',
      marginVertical: spacing.md,
    },
    detailsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailText: {
      fontSize: 13,
      color: '#475569',
      marginLeft: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    typeTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    typeTagText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    emptyState: {
      alignItems: 'center',
      marginTop: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 16,
      color: '#94a3b8',
      marginTop: spacing.md,
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
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredExams}
        renderItem={renderExam}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyText}>No exams found</Text>
          </View>
        }
      />
    </View>
  );
}
