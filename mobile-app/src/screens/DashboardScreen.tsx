import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { analyticsAPI, scheduleAPI, messagesAPI } from '../services/api';
import { formatDate, getExamLabel } from '../lib/utils';
import { getImageUrl } from '../lib/imageUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BroadcastModal from '../components/BroadcastModal';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [stats, setStats] = useState<any>(null);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [latestBroadcast, setLatestBroadcast] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [analyticsRes, examsRes, broadcastRes] = await Promise.all([
        analyticsAPI.getStudentDashboard(),
        scheduleAPI.getMyExams(),
        messagesAPI.getLatestBroadcast()
      ]);

      if (analyticsRes.data.success) setStats(analyticsRes.data.data);
      if (examsRes.data.success) setUpcomingExams(examsRes.data.data.slice(0, 2));
      if (broadcastRes.data.success) setLatestBroadcast(broadcastRes.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const QuickAction = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, value, label, color }: any) => (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      backgroundColor: '#4f46e5',
      padding: spacing.lg,
      paddingTop: spacing.xl,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      elevation: 5,
    },
    welcomeText: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
    },
    nameText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      marginTop: -30,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#fff',
      padding: spacing.md,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 4,
    },
    statLabel: {
      fontSize: 12,
      color: '#64748b',
      textAlign: 'center',
    },
    section: {
      padding: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: spacing.md,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    actionItem: {
      width: (width - spacing.lg * 2 - spacing.md) / 3,
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: spacing.md,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    actionIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#475569',
      textAlign: 'center',
    },
    examCard: {
      backgroundColor: '#fff',
      padding: spacing.md,
      borderRadius: 16,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    examIcon: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: '#fef3c7',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    examInfo: {
      flex: 1,
    },
    examTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    examDate: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2,
    },
    startBtn: {
      backgroundColor: '#10b981',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    startBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    broadcastCard: {
      backgroundColor: '#eff6ff',
      padding: spacing.md,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
      flexDirection: 'row',
      alignItems: 'center',
    },
    broadcastText: {
      flex: 1,
      fontSize: 14,
      color: '#1e40af',
      marginLeft: spacing.sm,
    }
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        {/* Branded School Name at Top */}
        <View style={{ marginBottom: spacing.lg, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.2)' }}>
          <Text 
            style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }} 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {(user?.schoolName || 'CBT Platform')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <MaterialCommunityIcons name="shield-check-decagram" size={14} color="#10b981" />
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', marginLeft: 6, letterSpacing: 1.2 }}>
              OFFICIAL STUDENT PORTAL
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{user?.fullName || 'Student'}</Text>
          </View>
          {user?.schoolLogo && (
            <Image
              source={{ uri: getImageUrl(user.schoolLogo) || '' }}
              style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff' }}
              resizeMode="contain"
            />
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="book-open-variant"
          value={stats?.totalExams || 0}
          label="Exams Taken"
          color="#4f46e5"
        />
        <StatCard
          icon="check-circle-outline"
          value={stats?.passedCount || 0}
          label="Passed"
          color="#10b981"
        />
        <StatCard
          icon="trending-up"
          value={stats?.averagePercentage ? `${parseFloat(stats.averagePercentage).toFixed(0)}%` : '0%'}
          label="Avg Score"
          color="#f59e0b"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="clipboard-list-outline"
            label="My Exams"
            color="#4f46e5"
            onPress={() => navigation.navigate('Exams')}
          />
          <QuickAction
            icon="poll"
            label="Results"
            color="#10b981"
            onPress={() => navigation.navigate('Results')}
          />
          <QuickAction
            icon="chart-bar"
            label="Analytics"
            color="#f59e0b"
            onPress={() => navigation.navigate('Performance')}
          />
          <QuickAction
            icon="trophy-outline"
            label="Competitions"
            color="#ec4899"
            onPress={() => navigation.navigate('CompetitionHub')}
          />
          <QuickAction
            icon="account-outline"
            label="Profile"
            color="#6366f1"
            onPress={() => navigation.navigate('Profile')}
          />
          <QuickAction
            icon="bell-outline"
            label="Messages"
            color="#ef4444"
            onPress={() => navigation.navigate('Messages')}
          />
        </View>
      </View>

      {latestBroadcast && (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <TouchableOpacity style={styles.broadcastCard}>
            <MaterialCommunityIcons name="bullhorn-variant-outline" size={24} color="#3b82f6" />
            <Text style={styles.broadcastText} numberOfLines={2}>
              {latestBroadcast.message}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        {upcomingExams.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color="#e2e8f0" />
            <Text style={{ color: '#94a3b8', marginTop: 8 }}>No exams scheduled for now</Text>
          </View>
        ) : (
          upcomingExams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => navigation.navigate('TakeExam', { scheduleId: exam.id })}
            >
              <View style={styles.examIcon}>
                <MaterialCommunityIcons name="clock-outline" size={28} color="#d97706" />
              </View>
              <View style={styles.examInfo}>
                <Text style={styles.examTitle}>{exam.examTitle}</Text>
                <Text style={styles.examDate}>
                  {formatDate(exam.scheduledDate)} at {exam.startTime}
                </Text>
              </View>
              <View style={styles.startBtn}>
                <Text style={styles.startBtnText}>START</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <BroadcastModal />
    </ScrollView>
  );
}
