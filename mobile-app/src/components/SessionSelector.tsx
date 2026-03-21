import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SessionSelectorProps {
  visible: boolean;
  onClose: () => void;
  years: any[];
  selectedYear: string;
  onSelect: (yearId: string) => void;
}

export default function SessionSelector({
  visible,
  onClose,
  years,
  selectedYear,
  onSelect,
}: SessionSelectorProps) {
  const { spacing } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons name="calendar-clock" size={24} color="#4f46e5" />
                  <Text style={styles.title}>Select Academic Session</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.item,
                    selectedYear === 'all' && styles.selectedItem,
                  ]}
                  onPress={() => {
                    onSelect('all');
                    onClose();
                  }}
                >
                  <View style={styles.itemContent}>
                    <MaterialCommunityIcons
                      name="earth"
                      size={20}
                      color={selectedYear === 'all' ? '#4f46e5' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.itemText,
                        selectedYear === 'all' && styles.selectedText,
                      ]}
                    >
                      All Sessions (Global View)
                    </Text>
                  </View>
                  {selectedYear === 'all' && (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>

                {years.map((year) => (
                  <TouchableOpacity
                    key={year.id}
                    style={[
                      styles.item,
                      selectedYear === year.id && styles.selectedItem,
                    ]}
                    onPress={() => {
                      onSelect(year.id);
                      onClose();
                    }}
                  >
                    <View style={styles.itemContent}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={20}
                        color={selectedYear === year.id ? '#4f46e5' : '#64748b'}
                      />
                      <View>
                        <Text
                          style={[
                            styles.itemText,
                            selectedYear === year.id && styles.selectedText,
                          ]}
                        >
                          {year.name}
                        </Text>
                        {year.is_active && (
                          <Text style={styles.activeLabel}>Active Session</Text>
                        )}
                      </View>
                    </View>
                    {selectedYear === year.id && (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '70%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  list: {
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedItem: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  selectedText: {
    color: '#4f46e5',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
