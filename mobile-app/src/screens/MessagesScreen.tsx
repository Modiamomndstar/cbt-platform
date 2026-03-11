import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MessagesScreen() {
  const { spacing } = useTheme();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const response = await messagesAPI.getInbox();
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    list: {
      padding: spacing.md,
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    iconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#eff6ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    preview: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2,
    },
    date: {
      fontSize: 11,
      color: '#94a3b8',
      marginTop: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: '#94a3b8',
      marginTop: spacing.md,
    }
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.list}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="email-outline" size={64} color="#e2e8f0" />
          <Text style={styles.emptyText}>Your inbox is empty</Text>
        </View>
      ) : (
        messages.map((item) => (
          <TouchableOpacity key={item.id} style={styles.card}>
            <View style={styles.iconBg}>
              <MaterialCommunityIcons name="bullhorn-variant-outline" size={24} color="#3b82f6" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.subject || 'School Announcement'}</Text>
              <Text style={styles.preview} numberOfLines={1}>{item.message}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
