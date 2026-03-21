import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { analyticsAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate } from '../lib/utils';

export default function TermReportScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { reportId } = route.params;
  const { spacing, colors } = useTheme();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const res = await analyticsAPI.getIssuedReportDetail(reportId);
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load report detail:', error);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const ScoreRow = ({ subject, isHeader = false }: any) => (
    <View style={[styles.row, isHeader && styles.headerRow]}>
      <Text style={[styles.cell, styles.subjectCell, isHeader && styles.headerText]}>
        {isHeader ? 'Subject' : subject.subject_name}
      </Text>
      <Text style={[styles.cell, styles.scoreCell, isHeader && styles.headerText]}>
        {isHeader ? 'CA1' : subject.ca1}
      </Text>
      <Text style={[styles.cell, styles.scoreCell, isHeader && styles.headerText]}>
        {isHeader ? 'CA2' : subject.ca2}
      </Text>
      <Text style={[styles.cell, styles.scoreCell, isHeader && styles.headerText]}>
        {isHeader ? 'Exam' : subject.exam_score}
      </Text>
      <Text style={[styles.cell, styles.totalCell, isHeader && styles.headerText, !isHeader && styles.totalText]}>
        {isHeader ? 'Total' : subject.total_score}
      </Text>
      <Text style={[styles.cell, styles.gradeCell, isHeader && styles.headerText, !isHeader && styles.gradeText]}>
        {isHeader ? 'G' : subject.grade}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!report) return null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.reportHeader}>
          <View style={styles.headerTop}>
            <View style={styles.titleBox}>
              <Text style={styles.periodName}>{report.period_name}</Text>
              <Text style={styles.reportTitle}>{report.title}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>OFFICIAL</Text>
            </View>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>AVERAGE</Text>
              <Text style={styles.infoValue}>{report.average_score}%</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>GRADE</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{report.overall_grade}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ISSUED ON</Text>
              <Text style={styles.infoValue}>{formatDate(report.created_at)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Subject Breakdown (10/10/30/50)</Text>
          <View style={styles.table}>
            <ScoreRow isHeader={true} />
            {report.subjects?.map((sub: any, idx: number) => (
              <ScoreRow key={idx} subject={sub} />
            ))}
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Subjects</Text>
            <Text style={styles.summaryValue}>{report.total_subjects}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Points</Text>
            <Text style={styles.summaryValue}>{report.total_points}</Text>
          </View>
        </View>

        {report.remarks && (
          <View style={styles.remarksCard}>
            <View style={styles.remarksHeader}>
              <MaterialCommunityIcons name="comment-text-outline" size={20} color={colors.primary} />
              <Text style={styles.remarksTitle}>Tutor Remarks</Text>
            </View>
            <Text style={styles.remarksText}>{report.remarks}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Close Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  reportHeader: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleBox: {
    flex: 1,
  },
  periodName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
  },
  tableContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 10,
    marginLeft: 4,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  cell: {
    fontSize: 13,
    color: '#475569',
  },
  subjectCell: {
    flex: 3,
  },
  scoreCell: {
    flex: 1,
    textAlign: 'center',
  },
  totalCell: {
    flex: 1.2,
    textAlign: 'center',
  },
  gradeCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  totalText: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  gradeText: {
    fontWeight: '900',
    color: '#6366f1',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  remarksCard: {
    backgroundColor: '#fdf4ff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fae8ff',
    marginBottom: 24,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  remarksTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a21caf',
  },
  remarksText: {
    fontSize: 14,
    color: '#701a75',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  backButton: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
