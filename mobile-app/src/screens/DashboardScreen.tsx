import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { analyticsAPI, scheduleAPI } from '../services/api';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, spacing, fontSize } = useTheme();
  
  const [stats, setStats] = useState<any>(null);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [analyticsRes, examsRes] = await Promise.all([
        analyticsAPI.getStudentDashboard(),
        scheduleAPI.getMyExams(),
      ]);

      if (analyticsRes.data.success) {
        setStats(analyticsRes.data.data);
      }

      if (examsRes.data.success) {
        setUpcomingExams(examsRes.data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      padding: spacing.lg,
      paddingTop: spacing.xl,
    },
    welcomeText: {
      fontSize: fontSize.lg,
      color: 'rgba(255,255,255,0.8)',
    },
    nameText: {
      fontSize: fontSize.xxl,
      fontWeight: 'bold',
      color: '#fff',
    },
    statsContainer: {
      flexDirection: 'row',
      padding: spacing.md,
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statNumber: {
      fontSize: fontSize.xxl,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      padding: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.md,
    },
    examCard: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    examTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.text,
    },
    examDate: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    startButton: {
      backgroundColor: colors.success,
      padding: spacing.sm,
      borderRadius: 8,
      marginTop: spacing.md,
      alignItems: 'center',
    },
    startButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    menuContainer: {
      flexDirection: 'row',
      padding: spacing.md,
      gap: spacing.md,
    },
    menuButton: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    menuButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.primary,
      marginTop: spacing.sm,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.firstName} {user?.lastName}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.totalExams || 0}</Text>
          <Text style={styles.statLabel}>Exams Taken</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.passedCount || 0}</Text>
          <Text style={styles.statLabel}>Passed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats?.averagePercentage ? `${parseFloat(stats.averagePercentage).toFixed(0)}%` : '0%'}
          </Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Exams')}
        >
          <Text style={styles.menuButtonText}>My Exams</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Results')}
        >
          <Text style={styles.menuButtonText}>Results</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.menuButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Exams</Text>
        {upcomingExams.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No upcoming exams</Text>
        ) : (
          upcomingExams.map((exam) => (
            <View key={exam.id} style={styles.examCard}>
              <Text style={styles.examTitle}>{exam.examTitle}</Text>
              <Text style={styles.examDate}>
                {new Date(exam.scheduledDate).toLocaleDateString()} at {exam.startTime}
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('TakeExam', { scheduleId: exam.id })}
              >
                <Text style={styles.startButtonText}>Start Exam</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
