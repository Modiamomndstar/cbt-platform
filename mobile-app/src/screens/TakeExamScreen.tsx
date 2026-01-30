import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleAPI, examAPI, resultAPI } from '../services/api';

export default function TakeExamScreen({ route, navigation }: any) {
  const { scheduleId } = route.params;
  const { colors, spacing, fontSize } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    loadExam();
  }, []);

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, timeLeft]);

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

  const submitExam = async () => {
    Alert.alert(
      'Submit Exam',
      'Are you sure you want to submit? You cannot change your answers after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: async () => {
            try {
              setLoading(true);
              const timeSpent = examData.durationMinutes * 60 - timeLeft;
              
              await resultAPI.submitExam({
                scheduleId,
                answers,
                timeSpentMinutes: Math.ceil(timeSpent / 60),
              });
              
              Alert.alert(
                'Exam Submitted',
                'Your exam has been submitted successfully!',
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
          }
        },
      ]
    );
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
    return (
      <View style={styles.container}>
        <View style={styles.startContainer}>
          <Text style={styles.examTitle}>{examData?.examTitle}</Text>
          <Text style={styles.examInfo}>Duration: {examData?.durationMinutes} minutes</Text>
          <Text style={styles.examInfo}>Total Questions: {questions.length}</Text>
          <Text style={styles.instructions}>
            Instructions:{'\n'}
            - Read each question carefully{'\n'}
            - Select the best answer{'\n'}
            - You cannot go back after submitting{'\n'}
            - The exam will auto-submit when time expires
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startExam}>
            <Text style={styles.startButtonText}>Start Exam</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const question = questions[currentQuestion];

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
  });

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
          <TouchableOpacity style={styles.submitButton} onPress={submitExam}>
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
