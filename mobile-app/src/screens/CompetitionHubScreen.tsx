import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { competitionAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CompetitionHubScreen({ navigation }: any) {
  const { colors, spacing } = useTheme();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCompetitions = useCallback(async () => {
    try {
      const response = await competitionAPI.getCompetitions();
      if (response.data.success) {
        setCompetitions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load competitions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  };

  const handleRegister = async (compId: string) => {
    try {
      const response = await competitionAPI.register(compId);
      if (response.data.success) {
        Alert.alert('Success', 'Registered successfully for the competition!');
        loadCompetitions();
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Failed to register');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      padding: spacing.lg,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
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
    card: {
      backgroundColor: '#fff',
      margin: spacing.md,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    cardBanner: {
      height: 100,
      backgroundColor: '#4f46e5',
      padding: spacing.md,
      justifyContent: 'flex-end',
    },
    categoryBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    categoryText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
    },
    cardContent: {
      padding: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: '#475569',
      marginLeft: 8,
    },
    registerBtn: {
      backgroundColor: '#4f46e5',
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      borderRadius: 12,
    },
    registerBtnText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    registeredBtn: {
      backgroundColor: '#10b981',
    },
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
        <Text style={styles.title}>Competition Hub</Text>
        <Text style={styles.subtitle}>Compete with others and win amazing prizes</Text>
      </View>

      {competitions.length === 0 ? (
        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <MaterialCommunityIcons name="trophy-variant-outline" size={64} color="#e2e8f0" />
          <Text style={{ color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
            No active competitions at the moment. Check back later!
          </Text>
        </View>
      ) : (
        competitions.map((comp) => (
          <View key={comp.id} style={styles.card}>
            <View style={[styles.cardBanner, { backgroundColor: comp.color || '#4f46e5' }]}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{comp.categoryName}</Text>
              </View>
              <Text style={styles.cardTitle}>{comp.title}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={18} color="#64748b" />
                <Text style={styles.infoText}>{formatDate(comp.startDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cash" size={18} color="#64748b" />
                <Text style={styles.infoText}>Prizes up to ₦{comp.prizePool}</Text>
              </View>

              <TouchableOpacity
                style={[styles.registerBtn, comp.isRegistered && styles.registeredBtn]}
                onPress={() => !comp.isRegistered && handleRegister(comp.id)}
                disabled={comp.isRegistered}
              >
                <Text style={styles.registerBtnText}>
                  {comp.isRegistered ? 'REGISTERED' : 'REGISTER NOW'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
