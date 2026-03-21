import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { courseAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CoursePlayerScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const { colors, spacing } = useTheme();
  
  const [course, setCourse] = useState<any>(null);
  const [structure, setStructure] = useState<any[]>([]);
  const [activeContent, setActiveContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'ai'>('content');
  
  // AI Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getById(courseId);
      if (res.data.success) {
        setCourse(res.data.data);
        const fullStructure = res.data.data.structure || [];
        setStructure(fullStructure);
        
        if (fullStructure.length > 0 && fullStructure[0].contents?.length > 0) {
          setActiveContent(fullStructure[0].contents[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loadingAi) return;

    const userMsg = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoadingAi(true);

    try {
      const res = await courseAPI.aiAssistant({
        lessonContent: activeContent?.contentData || '',
        userMessage: userMsg.content,
        history: messages
      });
      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.data }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setLoadingAi(false);
    }
  };

  const onSelectContent = async (content: any) => {
    setActiveContent(content);
    setActiveTab('content');
    try {
      await courseAPI.updateProgress(courseId, content.id);
    } catch (e) {
      console.warn('Progress update failed');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Header Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'content' && styles.activeTab]} 
          onPress={() => setActiveTab('content')}
        >
          <MaterialCommunityIcons name="book-open-variant" size={20} color={activeTab === 'content' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'content' && styles.activeTabLabel]}>Lessons</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]} 
          onPress={() => setActiveTab('ai')}
        >
          <MaterialCommunityIcons name="creation" size={20} color={activeTab === 'ai' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'ai' && styles.activeTabLabel]}>AI Coach</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'content' ? (
        <ScrollView style={styles.scroll}>
          {activeContent ? (
            <View style={styles.contentArea}>
              <Text style={styles.lessonTitle}>{activeContent.title}</Text>
              
              {/* Video Section */}
              {activeContent.contentType === 'video' && activeContent.videoUrl && (
                <TouchableOpacity 
                   style={styles.videoPlaceholder}
                   onPress={() => {
                     import('react-native').then(rn => rn.Linking.openURL(activeContent.videoUrl));
                   }}
                >
                   <View style={styles.videoIconBg}>
                      <MaterialCommunityIcons name="play" size={40} color="#fff" />
                   </View>
                   <Text style={styles.videoText}>Watch Lesson Video</Text>
                   <Text style={styles.videoUrlText}>{activeContent.videoUrl.substring(0, 40)}...</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.lessonBody}>{activeContent.contentData || (activeContent.contentType === 'video' ? 'Watch the video lesson above.' : 'No content provided.')}</Text>
              
              <View style={styles.navButtons}>
                 <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('ai')}>
                    <MaterialCommunityIcons name="help-circle-outline" size={20} color="#10b981" />
                    <Text style={styles.navBtnText}>Ask AI about this</Text>
                 </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCenter}>
               <Text style={styles.emptyText}>Select a lesson from the curriculum</Text>
            </View>
          )}

          {/* Curriculum List */}
          <View style={styles.curriculum}>
             <Text style={styles.curriculumHeader}>Curriculum</Text>
             {structure.map((mod, modIdx) => (
                <View key={mod.id} style={styles.module}>
                   <Text style={styles.moduleTitle}>Module {modIdx + 1}: {mod.title}</Text>
                   {mod.contents?.map((c: any) => (
                      <TouchableOpacity 
                        key={c.id} 
                        style={[styles.lessonItem, activeContent?.id === c.id && styles.activeLessonItem]}
                        onPress={() => onSelectContent(c)}
                      >
                         <MaterialCommunityIcons 
                           name={c.contentType === 'video' ? 'play-circle-outline' : 'file-document-outline'} 
                           size={20} 
                           color={activeContent?.id === c.id ? '#fff' : '#64748b'} 
                         />
                         <Text style={[styles.lessonItemText, activeContent?.id === c.id && styles.activeLessonItemText]}>
                           {c.title}
                         </Text>
                      </TouchableOpacity>
                   ))}
                </View>
             ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.aiContainer}>
           <FlatList
             ref={flatListRef}
             data={messages}
             keyExtractor={(_, i) => i.toString()}
             contentContainerStyle={styles.chatList}
             onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
             ListHeaderComponent={
               <View style={styles.aiHeader}>
                  <MaterialCommunityIcons name="creation" size={32} color="#10b981" />
                  <Text style={styles.aiHeaderTitle}>AI Tutor is active</Text>
                  <Text style={styles.aiHeaderSub}>Ask me anything about "{activeContent?.title}"</Text>
               </View>
             }
             renderItem={({ item }) => (
               <View style={[styles.msgBox, item.role === 'user' ? styles.userMsg : styles.aiMsg]}>
                  <Text style={[styles.msgText, item.role === 'user' && styles.userMsgText]}>{item.content}</Text>
               </View>
             )}
           />
           <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                placeholder="Ask your AI coach..."
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
                onPress={handleSendMessage}
                disabled={!inputText.trim() || loadingAi}
              >
                 {loadingAi ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
           </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#10b981',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  activeTabLabel: {
    color: '#10b981',
  },
  scroll: {
    flex: 1,
  },
  contentArea: {
    padding: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#f8fafc',
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  lessonBody: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
  },
  videoPlaceholder: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  videoIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoUrlText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },
  navButtons: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  navBtnText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  curriculum: {
    padding: 24,
  },
  curriculumHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  module: {
    marginBottom: 20,
  },
  moduleTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    gap: 10,
  },
  activeLessonItem: {
    backgroundColor: '#10b981',
  },
  lessonItemText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  activeLessonItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  aiContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatList: {
    padding: 16,
  },
  aiHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  aiHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
  },
  aiHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  msgBox: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#1e293b',
  },
  aiMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  userMsgText: {
    color: '#fff',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCenter: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});
