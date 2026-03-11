import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, AppState, AppStateStatus } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleAPI, examAPI, resultAPI } from '../services/api';
import { getRulesTitle, getExamLabel, formatTime } from '../lib/utils';

export default function TakeExamScreen({ route, navigation }: any) {
  const { scheduleId } = route.params;
  const { colors, spacing, fontSize } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    timer: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      alignItems: 'center',
    },
    timerText: {
      color: '#fff',
      fontSize: fontSize.xl,
      fontWeight: 'bold',
    },
    progress: {
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    progressText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    questionContainer: {
      flex: 1,
      padding: spacing.md,
    },
    questionText: {
      fontSize: fontSize.lg,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    option: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    optionText: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    navButton: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    navButtonDisabled: {
      backgroundColor: colors.border,
    },
    navButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: colors.success,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    startContainer: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: 'center',
    },
    examTitle: {
      fontSize: fontSize.xxl,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    examInfo: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    instructions: {
      fontSize: fontSize.md,
      color: colors.text,
      marginVertical: spacing.lg,
      lineHeight: 24,
    },
    startButton: {
      backgroundColor: colors.primary,
      padding: spacing.lg,
      borderRadius: 8,
      alignItems: 'center',
    },
    startButtonText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: 'bold',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '100%',
      maxHeight: '80%',
      padding: spacing.lg,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    rulesScroll: {
      marginBottom: spacing.md,
    },
    rulesText: {
      fontSize: fontSize.md,
      color: colors.text,
      lineHeight: 22,
    },
    instructionList: {
      marginTop: spacing.md,
    },
    instructionItem: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 4,
      marginRight: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    checkboxLabel: {
      fontSize: fontSize.sm,
      color: colors.text,
    },
    closeButton: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    closeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    badgeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    rulesSummaryText: {
      maxHeight: 150,
      marginBottom: spacing.lg,
    },
    flagButton: {
      padding: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    flagButtonActive: {
      backgroundColor: colors.warning + '20',
      borderColor: colors.warning,
    },
    flagButtonText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    flagButtonTextActive: {
      color: colors.warning,
      fontWeight: 'bold',
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

  useEffect(() => {
    loadExam();
  }, []);

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
    if (appState.match(/active/) && nextAppState === 'background') {
      const violation = {
        type: 'app_switch',
        timestamp: new Date().toISOString(),
        message: 'Student left the examination application'
      };

      setViolations(prev => [...prev, violation]);

      // Auto-submit if limit reached
      const maxAllowed = examData?.maxViolations || 3;
      if (violations.length + 1 >= maxAllowed) {
        Alert.alert(
          'Security Violation',
          'You have reached the maximum number of security violations. Your exam will be auto-submitted.',
          [{ text: 'OK', onPress: () => submitExam(true) }]
        );
      } else {
        Alert.alert(
          'Security Warning',
          `Violation ${violations.length + 1}/${maxAllowed}: Do not leave the app during the exam.`
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
    try {
      setLoading(true);
      const timeSpent = examData.durationMinutes * 60 - timeLeft;

      await resultAPI.submitExam({
        scheduleId,
        answers,
        timeSpentMinutes: Math.ceil(timeSpent / 60),
        violations,
        flaggedQuestions,
        autoSubmitted: isAuto
      });

      Alert.alert(
        isAuto ? 'Exam Auto-Submitted' : 'Exam Submitted',
        isAuto ? 'The exam was auto-submitted due to time expiry or security violation.' : 'Your exam has been submitted successfully!',
        [
          { text: 'View Results', onPress: () => navigation.navigate('Results') },
        ]
      );
    } catch (error) {
      console.error('Failed to submit exam:', error);
      Alert.alert('Error', 'Failed to submit exam');
    } finally {
      setLoading(false);
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
          <Text style={styles.examTitle}>{examData?.examTitle}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: isCompetition ? colors.primary : colors.success }]}>
              <Text style={styles.badgeText}>{isCompetition ? 'Competition' : 'Assessment'}</Text>
            </View>
            {examData?.isSecureMode && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>Secure Mode</Text>
              </View>
            )}
          </View>

          <Text style={styles.examInfo}>Duration: {examData?.durationMinutes} minutes</Text>
          <Text style={styles.examInfo}>Total Questions: {questions.length}</Text>

          <ScrollView style={styles.rulesSummaryText}>
             <Text style={styles.instructions}>
              Important Notes:{'\n'}
              - Read each question carefully{'\n'}
              - Select the best answer{'\n'}
              - You can flag questions for review{'\n'}
              {examData?.isSecureMode && `- Secure Mode is ENABLED. Switching apps will record a violation.${'\n'}`}
              - The {getExamLabel(isCompetition).toLowerCase()} will auto-submit when time expires
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.startButton} onPress={startExam}>
            <Text style={styles.startButtonText}>Launch {getExamLabel(isCompetition)}</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showRules && !!examData}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{getRulesTitle(isCompetition)}</Text>
              <ScrollView style={styles.rulesScroll}>
                 <Text style={styles.rulesText}>
                   {examData?.competitionRules || "Please ensure you have a stable internet connection. All activities are monitored for security."}
                 </Text>
                 <View style={styles.instructionList}>
                   <Text style={styles.instructionItem}>• Do not leave the application once started.</Text>
                   <Text style={styles.instructionItem}>• Ensure your device has sufficient battery.</Text>
                   <Text style={styles.instructionItem}>• Results will be available immediately after submission.</Text>
                 </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedRules(!acceptedRules)}
              >
                 <View style={[styles.checkbox, acceptedRules && styles.checkboxChecked]}>
                   {acceptedRules && <Text style={{color: '#fff', fontSize: 10}}>✓</Text>}
                 </View>
                 <Text style={styles.checkboxLabel}>I understand and agree to the rules</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeButton, !acceptedRules && { opacity: 0.5 }]}
                disabled={!acceptedRules}
                onPress={() => setShowRules(false)}
              >
                <Text style={styles.closeButtonText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const question = questions[currentQuestion];

  return (
    <View style={styles.container}>
      <View style={styles.timer}>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>

      <View style={styles.progress}>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.questionContainer}>
        <TouchableOpacity
          style={[styles.flagButton, flaggedQuestions.includes(question.id) && styles.flagButtonActive]}
          onPress={() => toggleFlag(question.id)}
        >
          <Text style={[styles.flagButtonText, flaggedQuestions.includes(question.id) && styles.flagButtonTextActive]}>
            {flaggedQuestions.includes(question.id) ? '🚩 Flagged' : '🏳️ Flag for Review'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.questionText}>{question?.questionText}</Text>

        {question?.options?.map((option: string, index: number) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              answers[question.id] === option && styles.optionSelected,
            ]}
            onPress={() => selectAnswer(question.id, option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
          onPress={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentQuestion === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={() => submitExam()}>
            <Text style={styles.submitButtonText}>Submit Exam</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
