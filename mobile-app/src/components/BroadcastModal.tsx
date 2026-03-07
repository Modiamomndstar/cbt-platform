import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../services/api';

const { width } = Dimensions.get('window');

export default function BroadcastModal() {
  const [broadcast, setBroadcast] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { colors, spacing, fontSize } = useTheme();

  useEffect(() => {
    const fetchLatestBroadcast = async () => {
      try {
        const res = await messagesAPI.getLatestBroadcast();
        if (res.data.success && res.data.data) {
          setBroadcast(res.data.data);
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Failed to fetch mobile broadcast:', error);
      }
    };

    fetchLatestBroadcast();
  }, []);

  const handleDismiss = async () => {
    if (broadcast) {
      try {
        await messagesAPI.markBroadcastAsViewed(broadcast.id);
      } catch (error) {
        console.error('Failed to mark mobile broadcast as viewed:', error);
      }
    }
    setIsVisible(false);
  };

  if (!broadcast) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => setIsVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="bullhorn" size={24} color={colors.primary} />
            </View>
            <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{broadcast.title}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {broadcast.created_at && !isNaN(new Date(broadcast.created_at).getTime()) ? new Date(broadcast.created_at).toLocaleDateString() : 'New Announcement'}
          </Text>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.content, { color: colors.text }]}>
              {broadcast.content}
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleDismiss}
          >
            <Text style={styles.buttonText}>Got it, thanks!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginBottom: 20,
  },
  contentScroll: {
    maxHeight: 300,
    marginBottom: 24,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
