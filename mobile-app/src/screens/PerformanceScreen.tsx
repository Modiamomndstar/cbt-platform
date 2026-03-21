import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { analyticsAPI, academicCalendarAPI } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { formatDate } from '../lib/utils';
import SessionSelector from '../components/SessionSelector';

const { width } = Dimensions.get('window');

export default function PerformanceScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isYearModalVisible, setYearModalVisible] = useState(false);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await academicCalendarAPI.getYears();
        setYears(res.data.data || []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadYears();
  }, []);

  const loadPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedYear !== 'all' ? { yearId: selectedYear } : {};
      const [perfRes, reportsRes] = await Promise.all([
        analyticsAPI.getPerformanceAnalytics(params),
        user?.id ? analyticsAPI.getIssuedReports(user.id).catch(() => ({ data: { success: true, data: [] } })) : Promise.resolve({ data: { success: true, data: [] } })
      ]);

      if (perfRes.data.success) {
        setData(perfRes.data.data);
      }
      if (reportsRes.data.success) {
        setReports(reportsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance, selectedYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPerformance();
    setRefreshing(false);
  };

  const ProgressBanner = ({ label, value, color }: any) => (
    <View style={styles.banner}>
      <View style={styles.bannerInfo}>
        <Text style={styles.bannerLabel}>{label}</Text>
        <Text style={[styles.bannerValue, { color }]}>{value}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      padding: spacing.lg,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#f5f3ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeFilterBadge: {
        backgroundColor: '#eef2ff',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    activeFilterText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4f46e5',
        textTransform: 'uppercase',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    subtitle: {
      fontSize: 14,
      color: '#64748b',
      marginTop: 4,
    },
    section: {
      backgroundColor: '#fff',
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: spacing.md,
    },
    banner: {
      marginBottom: spacing.md,
    },
    bannerInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    bannerLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#475569',
    },
    bannerValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    progressBarBg: {
      height: 10,
      backgroundColor: '#f1f5f9',
      borderRadius: 5,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
    },
    statIcon: {
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 12,
      color: '#64748b',
      textAlign: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginTop: 4,
    },
    reportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    reportIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    reportTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    reportMeta: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 2,
    },
    emptyBox: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      marginTop: 8,
      color: '#94a3b8',
      fontSize: 14,
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Your Performance</Text>
            <Text style={styles.subtitle}>Track your educational progress and growth</Text>
          </View>
          <TouchableOpacity 
            style={styles.filterBtn}
            onPress={() => setYearModalVisible(true)}
          >
            <MaterialCommunityIcons name="calendar-search" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        {selectedYear !== 'all' && (
          <View style={styles.activeFilterBadge}>
             <Text style={styles.activeFilterText}>
                Session: {years.find(y => y.id === selectedYear)?.name}
             </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#4f46e5" style={styles.statIcon} />
            <Text style={styles.statLabel}>Avg. Accuracy</Text>
            <Text style={styles.statValue}>{data?.averageScore || 0}%</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-fast" size={24} color="#10b981" style={styles.statIcon} />
            <Text style={styles.statLabel}>Tests Taken</Text>
            <Text style={styles.statValue}>{data?.totalExams || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={24} color="#f59e0b" style={styles.statIcon} />
            <Text style={styles.statLabel}>Pass Rate</Text>
            <Text style={styles.statValue}>{data?.passRate || 0}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject Breakdown</Text>
        {data?.subjects?.length > 0 ? (
          data.subjects.map((subject: any, index: number) => (
            <ProgressBanner
              key={index}
              label={subject.name}
              value={subject.score}
              color={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]}
            />
          ))
        ) : (
          <Text style={{ textAlign: 'center', color: '#64748b' }}>No subject data available yet</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issued Cumulative Reports</Text>
        {reports.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {reports.map((report: any) => (
              <TouchableOpacity 
                key={report.id} 
                style={styles.reportCard}
                onPress={() => navigation.navigate('TermReport', { reportId: report.id })}
              >
                <View style={styles.reportIconBox}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{report.title}</Text>
                  <Text style={styles.reportMeta}>
                    {formatDate(report.createdAt)} • {report.issuedByName || 'Official'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="file-hidden" size={40} color="#e2e8f0" />
            <Text style={styles.emptyText}>No term reports issued yet.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Strength</Text>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-decagram" size={20} color="#10b981" />
            <Text style={{ marginLeft: 8, color: '#334155' }}>Excellent performance in Mathematics</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#f59e0b" />
            <Text style={{ marginLeft: 8, color: '#334155' }}>Needs improvement in Verbal Reasoning</Text>
          </View>
        </View>
      </View>
      <SessionSelector
        visible={isYearModalVisible}
        onClose={() => setYearModalVisible(false)}
        years={years}
        selectedYear={selectedYear}
        onSelect={setSelectedYear}
      />
    </ScrollView>
  );
}
