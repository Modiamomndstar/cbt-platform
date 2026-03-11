import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ExamsScreen from './src/screens/ExamsScreen';
import TakeExamScreen from './src/screens/TakeExamScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ResultDetailScreen from './src/screens/ResultDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PerformanceScreen from './src/screens/PerformanceScreen';
import CompetitionHubScreen from './src/screens/CompetitionHubScreen';
import MessagesScreen from './src/screens/MessagesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Exams') iconName = 'book-open-variant';
          else if (route.name === 'Results') iconName = 'poll';
          else if (route.name === 'Performance') iconName = 'chart-timeline-variant';
          else if (route.name === 'Profile') iconName = 'account';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        headerStyle: { backgroundColor: '#4f46e5' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Exams" component={ExamsScreen} options={{ title: 'My Exams' }} />
      <Tab.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
      <Tab.Screen name="Performance" component={PerformanceScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="TakeExam"
            component={TakeExamScreen}
            options={{
              headerShown: true,
              title: 'Ongoing Exam',
              headerStyle: { backgroundColor: '#ef4444' },
              headerTintColor: '#fff',
              headerLeft: () => null
            }}
          />
          <Stack.Screen
            name="ResultDetail"
            component={ResultDetailScreen}
            options={{
              headerShown: true,
              title: 'Result Analysis',
              headerStyle: { backgroundColor: '#4f46e5' },
              headerTintColor: '#fff'
            }}
          />
          <Stack.Screen
            name="CompetitionHub"
            component={CompetitionHubScreen}
            options={{
              headerShown: true,
              title: 'Competition Hub',
              headerStyle: { backgroundColor: '#4f46e5' },
              headerTintColor: '#fff'
            }}
          />
          <Stack.Screen
            name="Messages"
            component={MessagesScreen}
            options={{
              headerShown: true,
              title: 'Notifications',
              headerStyle: { backgroundColor: '#4f46e5' },
              headerTintColor: '#fff'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <Navigation />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
