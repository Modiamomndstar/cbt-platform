import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  AppState, 
  AppStateStatus, 
  Platform,
  Image
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, examAPI, resultAPI } from '../services/api';
import { getRulesTitle, getExamLabel, formatTime } from '../lib/utils';
import { getImageUrl } from '../lib/imageUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TakeExamScreen({ route, navigation }: any) {
  const { scheduleId } = route.params;
  const { colors, spacing } = useTheme();
  const { user } = useAuth();

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
      alignItems: 'center',
    },
    cameraContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      flex: 1,
      justifyContent: 'space-between',
      padding: spacing.xl,
    },
    cameraTop: {
      alignItems: 'center',
      marginTop: 40,
    },
    cameraTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    cameraSubtitle: {
      color: '#cbd5e1',
      fontSize: 14,
      textAlign: 'center',
    },
    cameraBottom: {
      alignItems: 'center',
      marginBottom: 40,
    },
    captureBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#fff',
      borderWidth: 6,
      borderColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewImage: {
      flex: 1,
      resizeMode: 'cover',
    },
    previewActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
      padding: spacing.xl,
      backgroundColor: '#fff',
    },
    previewBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 12,
      minWidth: 120,
      alignItems: 'center',
    },
    retakeBtn: {
      backgroundColor: '#f1f5f9',
    },
    verifyBtn: {
      backgroundColor: '#4f46e5',
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
  const [identityVerified, setIdentityVerified] = useState(false);
  const [isUploadingIdentity, setIsUploadingIdentity] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const violationsRef = useRef<any[]>([]);
  const cameraRef = useRef<any>(null);

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

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Detect background/inactive transitions (Android/iOS)
    const isLeaving = (appState === 'active') && (nextAppState === 'background' || nextAppState === 'inactive');
    
    setAppState(nextAppState); // Always update current state

    if (isLeaving && examStarted && examData?.isSecureMode) {
      const violation = {
        type: 'app_switch',
        timestamp: new Date().toISOString(),
        message: 'Student left the examination application'
      };

      // 1. Update local UI
      const newViolations = [...violationsRef.current, violation];
      setViolations(newViolations);

      const maxAllowed = examData?.maxViolations || 3;
      const currentCount = newViolations.length;

      // 2. Report to Backend
      try {
        const response = await examAPI.recordViolation({
          scheduleId: scheduleId,
          violationType: 'app_switch',
          metadata: { message: violation.message }
        });

        if (response.data.success) {
           const { isDisqualified } = response.data.data;
           if (isDisqualified) {
             Alert.alert('Security Violation', 'Maximum violations reached. Your exam is being auto-submitted.');
             executeSubmission(true);
             return;
           }
        }
      } catch (err) {
        console.error('Failed to report violation to server:', err);
      }

      // Fallback for local state warning (if API fails or is slow)
      if (currentCount >= maxAllowed) {
        setTimeout(() => executeSubmission(true), 100);
        Alert.alert('Security Violation', 'Maximum violations reached. Your exam has been auto-submitted.');
      } else {
        Alert.alert(
          'Security Warning',
          `Violation ${currentCount}/${maxAllowed}: Do not leave the app. ${maxAllowed - currentCount} attempts remaining.`,
          [{ text: 'I Understand', style: 'default' }]
        );
      }
    }
  };
    
  const loadExam = async () => {
    try {
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        const exam = response.data.data.find((e: any) => e.id === scheduleId);
        if (exam) {
          // Security check: If exam is expired or completed, don't allow starting
          if (exam.isExpired || exam.isCompleted) {
            Alert.alert(
              'Exam Unavailable',
              `This exam has ${exam.isExpired ? 'expired' : 'been completed'}.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }

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

      try {
        const statusRes = await examAPI.getSecurityStatus(scheduleId);
        if (statusRes.data.success) {
           const { isDisqualified, identitySnapshotUrl } = statusRes.data.data;
           if (isDisqualified) {
             Alert.alert("Security Check", "This session is disqualified.");
             navigation.goBack();
             return;
           }
           if (identitySnapshotUrl) {
             setIdentityVerified(true);
           }
        }
      } catch (e) {
        console.warn("Security status sync failed");
      }

      // Check for camera permission if secure mode
      if (examData?.isSecureMode) {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(status === 'granted');
      }

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
    if (!examData) return;
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
          { 
            text: user?.isExternal ? 'Back to Exams' : 'View Results', 
            onPress: () => navigation.navigate(user?.isExternal ? 'Exams' : 'Results') 
          },
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
            [{ 
              text: user?.isExternal ? 'Back to Exams' : 'View History', 
              onPress: () => navigation.navigate(user?.isExternal ? 'Exams' : 'Results') 
            }]
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

  const formatTimeLocal = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleCaptureIdentity = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        setCapturedUri(photo.uri);
      } catch (e) {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handleUploadIdentity = async () => {
    if (!capturedUri) return;
    try {
      setIsUploadingIdentity(true);
      
      // Resize to save bandwidth
      const manipulated = await ImageManipulator.manipulateAsync(
        capturedUri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await examAPI.uploadIdentitySnapshot(scheduleId, manipulated.uri);
      
      if (response.data.success) {
        setIdentityVerified(true);
        Alert.alert('Success', 'Identity verified successfully!');
      }
    } catch (error) {
       console.error('Identity upload error:', error);
       Alert.alert('Error', 'Failed to verify identity. Please try again.');
    } finally {
      setIsUploadingIdentity(false);
    }
  };

  if (examData?.isSecureMode && !identityVerified) {
    if (cameraPermission === false) {
      return (
        <View style={styles.startContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color="#ef4444" style={{ alignSelf: 'center' }} />
          <Text style={styles.examTitle}>Camera Required</Text>
          <Text style={styles.infoText}>This is a secure exam and requires camera access for identity verification. Please enable camera permissions in your settings.</Text>
          <TouchableOpacity style={[styles.launchBtn, { marginTop: 24 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.launchBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (capturedUri) {
      return (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: capturedUri || undefined }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <TouchableOpacity 
              style={[styles.previewBtn, styles.retakeBtn]} 
              onPress={() => setCapturedUri(null)}
              disabled={isUploadingIdentity}
            >
              <Text style={{ color: '#475569', fontWeight: 'bold' }}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.previewBtn, styles.verifyBtn]} 
              onPress={handleUploadIdentity}
              disabled={isUploadingIdentity}
            >
              {isUploadingIdentity ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
             <View style={styles.cameraTop}>
                <Text style={styles.cameraTitle}>Identity Verification</Text>
                <Text style={styles.cameraSubtitle}>Position your face in the center of the frame</Text>
             </View>
             
             <View style={styles.cameraBottom}>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCaptureIdentity}>
                   <MaterialCommunityIcons name="camera" size={32} color="#4f46e5" />
                </TouchableOpacity>
             </View>
          </View>
        </CameraView>
      </View>
    );
  }

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
              • Do not minimize or leave this application.{'\n'}
              • Your progress is auto-saved locally.{'\n'}
              • Security violations will be recorded and may lead to disqualification.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.launchBtn}
            onPress={() => setShowRules(true)}
          >
            <Text style={styles.launchBtnText}>Start Examination</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showRules}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{getRulesTitle(isCompetition)}</Text>
              
              <ScrollView style={styles.rulesScroll}>
                <Text style={styles.rulesText}>
                  1. You must not receive assistance from anyone.{'\n'}
                  2. All your activities will be monitored.{'\n'}
                  3. Switching apps or minimizing will be flagged.{'\n'}
                  4. The exam will end automatically once the timer expires.{'\n'}
                  5. Ensure you have submitted all answers before leaving.
                </Text>
              </ScrollView>

              <View style={styles.agreeRow}>
                <TouchableOpacity 
                  style={[styles.checkbox, acceptedRules && { backgroundColor: '#4f46e5' }]}
                  onPress={() => setAcceptedRules(!acceptedRules)}
                >
                  {acceptedRules && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
                </TouchableOpacity>
                <Text style={{ fontSize: 13, color: '#4b5563' }}>I have read and agree to the rules</Text>
              </View>

              <View style={styles.footer}>
                 <TouchableOpacity 
                   style={[styles.navBtn, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                   onPress={() => setShowRules(false)}
                 >
                    <Text style={{ color: '#475569', fontWeight: 'bold' }}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={[styles.navBtn, { flex: 2, backgroundColor: acceptedRules ? '#4f46e5' : '#cbd5e1' }, !acceptedRules && { elevation: 0 }]}
                   disabled={!acceptedRules}
                   onPress={() => {
                     setShowRules(false);
                     startExam();
                   }}
                 >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Begin Exam</Text>
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const currentQ = questions[currentQuestion];
  const progressPercent = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.timerArea}>
        <MaterialCommunityIcons name="clock-outline" size={24} color="#fff" />
        <Text style={styles.timerText}>{formatTimeLocal(timeLeft)}</Text>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Question {currentQuestion + 1} of {questions.length}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
      </View>

      <ScrollView style={styles.questionScroll}>
        <View style={styles.questionContainer}>
           <TouchableOpacity 
             style={[styles.flagBtn, flaggedQuestions.includes(currentQ?.id) && { backgroundColor: '#fee2e2' }]} 
             onPress={() => toggleFlag(currentQ?.id)}
           >
              <MaterialCommunityIcons 
                name={flaggedQuestions.includes(currentQ?.id) ? "flag" : "flag-outline"} 
                size={20} 
                color={flaggedQuestions.includes(currentQ?.id) ? "#ef4444" : "#94a3b8"} 
              />
              <Text style={{ marginLeft: 8, color: flaggedQuestions.includes(currentQ?.id) ? "#ef4444" : "#64748b", fontWeight: '600' }}>
                {flaggedQuestions.includes(currentQ?.id) ? "Flagged" : "Flag for Review"}
              </Text>
           </TouchableOpacity>

           <Text style={styles.questionText}>{currentQ?.questionText}</Text>

           {currentQ?.imageUrl && (
             <Image source={{ uri: getImageUrl(currentQ.imageUrl) || undefined }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 20 }} resizeMode="contain" />
           )}

           {currentQ?.options?.map((opt: any, idx: number) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = answers[currentQ.id] === opt;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => selectAnswer(currentQ.id, opt)}
                >
                  <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                    <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>{letter}</Text>
                  </View>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              )
           })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
         <TouchableOpacity 
           style={[styles.navBtn, styles.prevBtn, currentQuestion === 0 && { opacity: 0.5 }]} 
           disabled={currentQuestion === 0}
           onPress={() => setCurrentQuestion(prev => prev - 1)}
         >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#475569" />
            <Text style={[styles.navBtnText, { color: '#475569' }]}>Prev</Text>
         </TouchableOpacity>

         {currentQuestion === questions.length - 1 ? (
            <TouchableOpacity 
              style={[styles.navBtn, styles.submitBtn]} 
              onPress={() => submitExam()}
              disabled={isSubmitting}
            >
               {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.navBtnText, { color: '#fff' }]}>Submit</Text>}
            </TouchableOpacity>
         ) : (
            <TouchableOpacity 
              style={[styles.navBtn, styles.nextBtn]} 
              onPress={() => setCurrentQuestion(prev => prev + 1)}
            >
               <Text style={[styles.navBtnText, { color: '#fff' }]}>Next</Text>
               <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
         )}
      </View>
    </View>
  );
}
