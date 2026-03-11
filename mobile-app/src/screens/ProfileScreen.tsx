import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, spacing } = useTheme();

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      backgroundColor: '#4f46e5',
      padding: spacing.xl,
      alignItems: 'center',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    avatarContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
      marginBottom: spacing.md,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#4f46e5',
    },
    name: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#fff',
    },
    roleTag: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      marginTop: 8,
    },
    roleText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      padding: spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#f1f5f9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: '#64748b',
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1e293b',
      marginTop: 2,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: spacing.md,
      borderRadius: 16,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    actionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: '#475569',
      marginLeft: spacing.md,
    },
    input: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      padding: spacing.md,
      marginBottom: spacing.md,
      color: '#1e293b',
    },
    updateBtn: {
      backgroundColor: '#4f46e5',
      padding: spacing.md,
      borderRadius: 10,
      alignItems: 'center',
    },
    updateBtnText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      marginTop: spacing.xl,
      gap: 8,
    },
    logoutText: {
      color: '#ef4444',
      fontSize: 16,
      fontWeight: 'bold',
    }
  });

  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.firstName?.[0]?.toUpperCase() || 'S';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || user?.firstName + ' ' + user?.lastName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>Internal Student</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#4f46e5" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="identifier" size={20} color="#10b981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Portal ID</Text>
              <Text style={styles.infoValue}>{user?.id}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="school-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>School Code</Text>
              <Text style={styles.infoValue}>{user?.schoolId}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setChangingPassword(!changingPassword)}
        >
          <MaterialCommunityIcons name="lock-reset" size={24} color="#64748b" />
          <Text style={styles.actionText}>Change Password</Text>
          <MaterialCommunityIcons name={changingPassword ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
        </TouchableOpacity>

        {changingPassword && (
          <View style={[styles.card, { marginTop: spacing.md }]}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: spacing.xl }}>
        Version 1.1.0 • Built with Excellence
      </Text>
    </ScrollView>
  );
}
