import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { colors, spacing, fontSize } = useTheme();

  const [activeTab, setActiveTab] = useState<'portal' | 'exam'>('portal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter your credentials');
      return;
    }

    setIsLoading(true);
    const result = await login(activeTab, username, password, accessCode);
    setIsLoading(false);

    if (result.success) {
      if (activeTab === 'exam' && result.data?.exam?.scheduleId) {
        navigation.replace('TakeExam', { scheduleId: result.data.exam.scheduleId });
      } else {
        navigation.replace('Main');
      }
    } else {
      Alert.alert('Login Failed', result.message || 'Invalid credentials');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    scrollView: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logo: {
      width: 80,
      height: 80,
      backgroundColor: activeTab === 'portal' ? '#4f46e5' : '#10b981',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    logoText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#1e293b',
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 16,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderRadius: 12,
      padding: 4,
      marginBottom: spacing.xl,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    activeTab: {
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748b',
    },
    activeTabText: {
      color: '#1e293b',
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: '#334155',
      marginBottom: spacing.xs,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: spacing.md,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: '#1e293b',
    },
    button: {
      backgroundColor: activeTab === 'portal' ? '#4f46e5' : '#10b981',
      padding: spacing.md,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 4,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    helpContainer: {
      marginTop: spacing.xl,
      padding: spacing.md,
      backgroundColor: activeTab === 'portal' ? '#eef2ff' : '#ecfdf5',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: activeTab === 'portal' ? '#e0e7ff' : '#d1fae5',
    },
    helpTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: activeTab === 'portal' ? '#3730a3' : '#065f46',
      marginBottom: 4,
    },
    helpText: {
      fontSize: 12,
      color: activeTab === 'portal' ? '#4338ca' : '#047857',
      lineHeight: 18,
    },
    footerContainer: {
      marginTop: 'auto',
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: '#94a3b8',
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CBT</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to take your assessments</Text>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'portal' && styles.activeTab]}
            onPress={() => setActiveTab('portal')}
          >
            <MaterialCommunityIcons
              name="account"
              size={18}
              color={activeTab === 'portal' ? '#4f46e5' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'portal' && styles.activeTabText]}>Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'exam' && styles.activeTab]}
            onPress={() => setActiveTab('exam')}
          >
            <MaterialCommunityIcons
              name="key-variant"
              size={18}
              color={activeTab === 'exam' ? '#10b981' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'exam' && styles.activeTabText]}>Exam Access</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'exam' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Access Code (Optional)</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="numeric" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter exam access code"
                value={accessCode}
                onChangeText={setAccessCode}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {activeTab === 'portal' ? 'Login to Portal' : 'Start Exam'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>
            {activeTab === 'portal' ? 'Student Portal' : 'Important Note'}
          </Text>
          <Text style={styles.helpText}>
            {activeTab === 'portal'
              ? 'Login here to view your permanent profile, history, and all dashboard features.'
              : 'You can only login during your scheduled exam time. Ensure you have a stable connection.'}
          </Text>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Contact school admin if you need help logging in.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
