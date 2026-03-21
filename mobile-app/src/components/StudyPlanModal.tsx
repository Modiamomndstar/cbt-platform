import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { height, width } = Dimensions.get('window');

interface StudyPlanModalProps {
  visible: boolean;
  onClose: () => void;
  plan: {
    weeklyOverview: string;
    dailySchedule: Array<{
      day: string;
      tasks: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
  } | null;
}

export default function StudyPlanModal({ visible, onClose, plan }: StudyPlanModalProps) {
  const { colors, spacing } = useTheme();

  if (!plan) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="creation" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Your AI Study Plan</Text>
                <Text style={styles.headerSubtitle}>Personalized weekly roadmap</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewText}>{plan.weeklyOverview}</Text>
            </View>

            <View style={styles.scheduleContainer}>
              {plan.dailySchedule.map((day, idx) => (
                <View key={idx} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayTitleRow}>
                      <View 
                        style={[
                          styles.priorityDot, 
                          { backgroundColor: day.priority === 'high' ? '#ef4444' : '#f59e0b' }
                        ]} 
                      />
                      <Text style={styles.dayName}>{day.day}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: day.priority === 'high' ? '#fee2e2' : '#fef3c7' }]}>
                      <Text style={[styles.priorityBadgeText, { color: day.priority === 'high' ? '#b91c1c' : '#b45309' }]}>
                        {day.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tasksList}>
                    {day.tasks.map((task, tIdx) => (
                      <View key={tIdx} style={styles.taskItem}>
                        <View style={styles.taskCheckbox} />
                        <Text style={styles.taskText}>{task}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tipCard}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
              <Text style={styles.tipText}>
                Tip: Start with high-priority items first and take 5-minute breaks every 25 minutes.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    height: height * 0.85,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#4f46e5',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  overviewText: {
    fontSize: 15,
    color: '#1e40af',
    lineHeight: 22,
  },
  scheduleContainer: {
    gap: 16,
    marginBottom: 24,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 10,
    marginTop: 1,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  doneButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
