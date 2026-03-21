import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { courseAPI, academicCalendarAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SessionSelector from '../components/SessionSelector';

export default function CourseLibraryScreen({ navigation }: any) {
  const { colors, spacing } = useTheme();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('active');
  const [isYearModalVisible, setYearModalVisible] = useState(false);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await academicCalendarAPI.getYears();
        const yearsList = res.data.data || [];
        setYears(yearsList);
        
        // Find active year for initial selection
        const active = yearsList.find((y: any) => y.is_active);
        if (selectedYear === 'active' && active) {
          setSelectedYear(active.id);
        } else if (selectedYear === 'active') {
          setSelectedYear('all');
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadYears();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedYear !== 'all' && selectedYear !== 'active') {
        params.yearId = selectedYear;
      }
      const res = await courseAPI.getAll(params);
      if (res.data.success) {
        setCourses(res.data.data.filter((c: any) => c.is_published));
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedYear !== 'active') {
       loadCourses();
    }
  }, [selectedYear]);

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const renderCourseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CoursePlayer', { courseId: item.id })}
    >
      <View style={[styles.cardAccent, { backgroundColor: '#10b981' }]} />
      <View style={styles.cardContent}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category_name || 'General'}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.tutor} numberOfLines={1}>By {item.tutor_name}</Text>
        
        <View style={styles.footer}>
          <View style={styles.aiBadge}>
            <MaterialCommunityIcons name="creation" size={12} color="#10b981" />
            <Text style={styles.aiText}>AI ASSISTED</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#64748b" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </div>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search courses..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity 
          style={styles.yearFilter}
          onPress={() => setYearModalVisible(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#10b981" />
          <Text style={styles.yearFilterText} numberOfLines={1}>
            {selectedYear === 'all' ? 'All Sessions' : (years.find(y => y.id === selectedYear)?.name || 'Select Session')}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-open-variant" size={64} color="#e2e8f0" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'No courses match your search.' : 'No courses available for this session.'}
            </Text>
          </View>
        }
      />

      <SessionSelector
        visible={isYearModalVisible}
        onClose={() => setYearModalVisible(false)}
        years={years}
        selectedYear={selectedYear}
        onSelect={setSelectedYear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 16,
  },
  searchHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    height: '100%',
  },
  yearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  yearFilterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#166534',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardAccent: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  tutor: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
