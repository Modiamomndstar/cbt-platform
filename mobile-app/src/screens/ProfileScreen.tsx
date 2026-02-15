import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, spacing, fontSize } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        },
      ]
    );
  };

  const [changingPassword, setChangingPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { authAPI } = require('../services/api');

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
      Alert.alert('Success', 'Password changed successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      padding: spacing.xl,
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    avatarText: {
      fontSize: fontSize.xxl,
      fontWeight: 'bold',
      color: colors.primary,
    },
    name: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: '#fff',
    },
    email: {
      fontSize: fontSize.md,
      color: 'rgba(255,255,255,0.8)',
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
    infoCard: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: '500',
    },
    button: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: spacing.sm,
    },
    buttonText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    logoutButton: {
      backgroundColor: colors.error,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
      margin: spacing.md,
    },
    logoutButtonText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    versionText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: fontSize.sm,
      marginTop: spacing.md,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      color: colors.text,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>Student</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID</Text>
            <Text style={styles.infoValue}>{user?.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>School ID</Text>
            <Text style={styles.infoValue}>{user?.schoolId}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setChangingPassword(!changingPassword)}
        >
          <Text style={styles.buttonText}>
            {changingPassword ? 'Cancel Change Password' : 'Change Password'}
          </Text>
        </TouchableOpacity>

        {changingPassword && (
          <View style={styles.infoCard}>
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
              style={[styles.button, { marginTop: spacing.sm }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Support</Text>
            <Text style={styles.infoValue}>support@cbtplatform.com</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Help Center</Text>
            <Text style={styles.infoValue}>Visit Help Center</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>CBT Platform Mobile v1.0.0</Text>
    </ScrollView>
  );
}
