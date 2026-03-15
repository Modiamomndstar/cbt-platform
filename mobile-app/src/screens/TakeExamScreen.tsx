import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, AppState, AppStateStatus, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleAPI, examAPI, resultAPI } from '../services/api';
import { getRulesTitle, getExamLabel, formatTime } from '../lib/utils';
import { getImageUrl } from '../lib/imageUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

export default function TakeExamScreen({ route, navigation }: any) {
  const { scheduleId } = route.params;
  const { colors, spacing } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    timerArea: {
      backgroundColor: '#4f46e5',
      padding: spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    timerText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    progressHeader: {
      padding: spacing.md,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748b',
    },
    progressBarBg: {
      height: 6,
      backgroundColor: '#f1f5f9',
      borderRadius: 3,
      flex: 1,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#4f46e5',
    },
    questionScroll: {
      flex: 1,
    },
    questionContainer: {
      padding: spacing.lg,
    },
    flagBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      padding: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1e293b',
      lineHeight: 26,
      marginBottom: spacing.xl,
    },
    option: {
      backgroundColor: '#fff',
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.md,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionSelected: {
      borderColor: '#4f46e5',
      backgroundColor: '#f5f3ff',
    },
    optionLetter: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f1f5f9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    optionLetterSelected: {
      backgroundColor: '#4f46e5',
    },
    optionLetterText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#475569',
    },
    optionLetterTextSelected: {
      color: '#fff',
    },
    optionText: {
      fontSize: 15,
      color: '#334155',
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    navBtn: {
      height: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    prevBtn: {
      backgroundColor: '#f1f5f9',
    },
    nextBtn: {
      backgroundColor: '#4f46e5',
    },
    submitBtn: {
      backgroundColor: '#10b981',
    },
    navBtnText: {
      fontWeight: 'bold',
      fontSize: 14,
    },
    startContainer: {
      flex: 1,
      padding: spacing.xl,
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    startHeader: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    examTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1e293b',
      textAlign: 'center',
      marginTop: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
      marginVertical: spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statVal: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#4f46e5',
    },
    statLab: {
      fontSize: 12,
      color: '#64748b',
    },
    infoCard: {
      backgroundColor: '#f8fafc',
      padding: spacing.md,
      borderRadius: 16,
      marginBottom: spacing.xl,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#475569',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: '#64748b',
      lineHeight: 20,
    },
    launchBtn: {
      backgroundColor: '#4f46e5',
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    launchBtnText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '100%',
      padding: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    rulesScroll: {
      maxHeight: 300,
      marginBottom: spacing.md,
    },
    rulesText: {
      fontSize: 14,
      color: '#4b5563',
      lineHeight: 22,
    },
    agreeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#4f46e5',
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    proceedBtn: {
      backgroundColor: '#4f46e5',
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
  });

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [violations, setViolations] = useState<any[]>([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outboxSyncing, setOutboxSyncing] = useState(false);
  const violationsRef = useRef<any[]>([]);

  // Update ref when violations state changes
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  useEffect(() => {
    loadExam();
    syncOutbox();
  }, []);

  // Auto-save progress
  useEffect(() => {
    if (examStarted && questions.length > 0) {
      saveProgress();
    }
  }, [answers, timeLeft, flaggedQuestions, violations, examStarted]);

  const getStorageKey = () => `exam_progress_${scheduleId}`;

  const saveProgress = async () => {
    try {
      const state = {
        answers,
        timeLeft,
        flaggedQuestions,
        violations,
        lastUpdated: new Date().toISOString()
      };
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(getStorageKey());
      if (saved) {
        const state = JSON.parse(saved);
        
        // Show resume prompt
        Alert.alert(
          'Resume Exam',
          'We found an unfinished session for this exam. Would you like to resume?',
          [
            { 
              text: 'Start New', 
              style: 'destructive',
              onPress: () => AsyncStorage.removeItem(getStorageKey())
            },
            { 
              text: 'Resume', 
              onPress: () => {
                setAnswers(state.answers || {});
                setTimeLeft(state.timeLeft || 0);
                setFlaggedQuestions(state.flaggedQuestions || []);
                setViolations(state.violations || []);
                setExamStarted(true);
                setShowRules(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const syncOutbox = async () => {
    if (outboxSyncing) return;
    try {
      setOutboxSyncing(true);
      const outbox = await AsyncStorage.getItem('exam_outbox');
      if (outbox) {
        const items = JSON.parse(outbox);
        if (items.length > 0) {
          console.log(`Syncing ${items.length} items from outbox...`);
          const failedItems = [];
          
          for (const item of items) {
            try {
              await resultAPI.submitExam(item);
            } catch (err) {
              failedItems.push(item);
            }
          }
          
          if (failedItems.length === 0) {
            await AsyncStorage.removeItem('exam_outbox');
          } else {
            await AsyncStorage.setItem('exam_outbox', JSON.stringify(failedItems));
          }
        }
      }
    } catch (error) {
      console.error('Outbox sync failed:', error);
    } finally {
      setOutboxSyncing(false);
    }
  };

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, timeLeft]);

  // Anti-cheating observer
  useEffect(() => {
    if (!examStarted || !examData?.isSecureMode) return;

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [examStarted, examData]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Detect background/inactive transitions (Android/iOS)
    const isLeaving = (appState === 'active') && (nextAppState === 'background' || nextAppState === 'inactive');
    
    if (isLeaving) {
      const violation = {
        type: 'app_switch',
        timestamp: new Date().toISOString(),
        message: 'Student left the examination application'
      };

      const newViolations = [...violationsRef.current, violation];
      setViolations(newViolations);

      const maxAllowed = examData?.maxViolations || 3;
      const currentCount = newViolations.length;

      if (currentCount >= maxAllowed) {
        // Final violation: Auto-submit IMMEDIATELY
        console.log(`[AntiCheating] Final violation ${currentCount}/${maxAllowed}. Auto-submitting...`);
        
        // We use a small timeout to ensure the state updates or logs can be processed, 
        // but we don't wait for user interaction.
        setTimeout(() => executeSubmission(true), 100);

        Alert.alert(
          'Security Violation',
          'You have reached the maximum number of security violations. Your exam has been auto-submitted.',
          [{ text: 'OK' }]
        );
      } else {
        // Warning violation
        console.log(`[AntiCheating] Violation ${currentCount}/${maxAllowed}`);
        Alert.alert(
          'Security Warning',
          `Violation ${currentCount}/${maxAllowed}: Do not leave the app during the exam. ${maxAllowed - currentCount} attempts remaining.`,
          [{ text: 'I Understand', style: 'default' }]
        );
      }
    }
    
    setAppState(nextAppState);
  };

  const loadExam = async () => {
    try {
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        const exam = response.data.data.find((e: any) => e.id === scheduleId);
        if (exam) {
          setExamData(exam);

          // Load questions
          const questionsRes = await examAPI.getQuestions(exam.examId);
          if (questionsRes.data.success) {
            setQuestions(questionsRes.data.data);
          }

          setTimeLeft(exam.durationMinutes * 60);
        }
      }
    } catch (error) {
      console.error('Failed to load exam:', error);
      Alert.alert('Error', 'Failed to load exam');
    } finally {
      setLoading(false);
      // Check for resumable session after loading exam
      loadProgress();
    }
  };

  const startExam = () => {
    Alert.alert(
      'Start Exam',
      'Are you sure you want to start? The timer will begin.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => setExamStarted(true) },
      ]
    );
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const submitExam = async (isAuto = false) => {
    if (!isAuto) {
      Alert.alert(
        'Submit Exam',
        'Are you sure you want to submit? You cannot change your answers after submission.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => executeSubmission(false) },
        ]
      );
    } else {
      executeSubmission(true);
    }
  };

  const executeSubmission = async (isAuto: boolean) => {
    const timeSpent = examData.durationMinutes * 60 - timeLeft;
    const payload = {
      scheduleId,
      answers,
      timeSpentMinutes: Math.ceil(timeSpent / 60),
      violations,
      flaggedQuestions,
      autoSubmitted: isAuto
    };

    try {
      setLoading(true);
      setIsSubmitting(true);
      
      await resultAPI.submitExam(payload);

      // Clear saved progress on success
      await AsyncStorage.removeItem(getStorageKey());

      Alert.alert(
        isAuto ? 'Exam Auto-Submitted' : 'Exam Submitted',
        isAuto ? 'The exam was auto-submitted due to time expiry or security violation.' : 'Your exam has been submitted successfully!',
        [
          { text: 'View Results', onPress: () => navigation.navigate('Results') },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit exam:', error);
      
      // Handle Network Error / Offline
      if (!error.response || error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        try {
          const outbox = await AsyncStorage.getItem('exam_outbox');
          const items = outbox ? JSON.parse(outbox) : [];
          items.push(payload);
          await AsyncStorage.setItem('exam_outbox', JSON.stringify(items));
          await AsyncStorage.removeItem(getStorageKey());

          Alert.alert(
            'Offline Submission',
            'You are currently offline. Your exam has been saved locally and will be synced automatically when your connection is restored.',
            [{ text: 'View History', onPress: () => navigation.navigate('Results') }]
          );
        } catch (storageErr) {
          Alert.alert('Submission Error', 'Failed to save exam locally. Please try submitting again when you have a connection.');
        }
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to submit exam');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!examStarted) {
    const isCompetition = !!examData?.isCompetition;
    return (
      <View style={styles.container}>
        <View style={styles.startContainer}>
          <View style={styles.startHeader}>
            <MaterialCommunityIcons
              name={isCompetition ? "trophy-outline" : "clipboard-text-outline"}
              size={64}
              color="#4f46e5"
            />
            <Text style={styles.examTitle}>{examData?.examTitle}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{examData?.durationMinutes}</Text>
              <Text style={styles.statLab}>Minutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{questions.length}</Text>
              <Text style={styles.statLab}>Questions</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>EXAMINATION RULES</Text>
            <Text style={styles.infoText}>
              • Ensure a stable internet connection.{'\n'}
              • Do not minimize or switch the application.{'\n'}
              • Results available immediately after submission.{'\n'}
              {examData?.isSecureMode && '• SECURE MODE: App switching is strictly forbidden.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.launchBtn} onPress={startExam}>
            <Text style={styles.launchBtnText}>Launch {isCompetition ? 'Competition' : 'Assessment'}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showRules && !!examData} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{getRulesTitle(isCompetition)}</Text>
              <ScrollView style={styles.rulesScroll}>
                 <Text style={styles.rulesText}>
                   {examData?.competitionRules || "Please ensure you have a stable internet connection. All activities are monitored for security."}
                 </Text>
              </ScrollView>
              <TouchableOpacity style={styles.agreeRow} onPress={() => setAcceptedRules(!acceptedRules)}>
                 <View style={[styles.checkbox, acceptedRules && { backgroundColor: '#4f46e5' }]}>
                   {acceptedRules && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
                 </View>
                 <Text style={{ color: '#4b5563' }}>I understand and agree to the rules</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proceedBtn, !acceptedRules && { opacity: 0.5 }]}
                disabled={!acceptedRules}
                onPress={() => setShowRules(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.timerArea}>
        <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Question {currentQuestion + 1} of {questions.length}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContainer}>
        <TouchableOpacity
          style={[styles.flagBtn, { backgroundColor: flaggedQuestions.includes(question?.id) ? '#fef3c7' : '#f1f5f9' }]}
          onPress={() => toggleFlag(question.id)}
        >
          <MaterialCommunityIcons
            name={flaggedQuestions.includes(question?.id) ? "flag" : "flag-outline"}
            size={18}
            color={flaggedQuestions.includes(question?.id) ? "#d97706" : "#64748b"}
          />
          <Text style={{ marginLeft: 8, color: flaggedQuestions.includes(question?.id) ? "#d97706" : "#64748b", fontWeight: '600' }}>
            {flaggedQuestions.includes(question?.id) ? 'FLAGGED FOR REVIEW' : 'FLAG THIS QUESTION'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.questionText}>{question?.questionText}</Text>

        {question?.image_url && (
          <Image
            source={{ uri: getImageUrl(question.image_url) || '' }}
            style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: spacing.lg }}
            resizeMode="contain"
          />
        )}

        {question?.options?.map((option: string, index: number) => (
          <TouchableOpacity
            key={index}
            style={[styles.option, answers[question.id] === option && styles.optionSelected]}
            onPress={() => selectAnswer(question.id, option)}
          >
            <View style={[styles.optionLetter, answers[question.id] === option && styles.optionLetterSelected]}>
              <Text style={[styles.optionLetterText, answers[question.id] === option && styles.optionLetterTextSelected]}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, styles.prevBtn, currentQuestion === 0 && { opacity: 0.5 }]}
          onPress={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color="#475569" />
          <Text style={[styles.navBtnText, { color: '#475569' }]}>Back</Text>
        </TouchableOpacity>

        {currentQuestion === questions.length - 1 ? (
          <TouchableOpacity style={[styles.navBtn, styles.submitBtn]} onPress={() => submitExam()}>
            <Text style={[styles.navBtnText, { color: '#fff' }]}>Submit Final</Text>
            <MaterialCommunityIcons name="check-all" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            <Text style={[styles.navBtnText, { color: '#fff' }]}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
