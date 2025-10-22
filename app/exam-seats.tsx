import { useCustomAlert } from '@/components/CustomAlert';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy } from '@/utils/gucApiProxy';
import { ExamSeat, formatExamDate, getExamTypeColor, parseExamSeatsHTML } from '@/utils/parsers/examSeatsParser';
import { MaterialIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExamSeatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [examSeats, setExamSeats] = useState<ExamSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  // const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    loadExamSeats();
  }, []);


  const loadExamSeats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch exam seats data from the real API
      const htmlData = await GUCAPIProxy.getExamSeats();
      const { examSeats: parsedSeats } = parseExamSeatsHTML(htmlData);
      setExamSeats(parsedSeats);
      // setStudentName(parsedName);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to load exam seats. Please try again.',
        type: 'error',
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadExamSeats(true);
  };


  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerShown: false 
          }} 
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.mainFont }]}>Exam Seats</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
              Loading exam seats...
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]}>Exam Seats</Text>
          <View style={styles.placeholder} />
        </View>

       <ScrollView 
         style={styles.content} 
         showsVerticalScrollIndicator={false}
         refreshControl={
           <AppRefreshControl
             refreshing={refreshing}
             onRefresh={handleRefresh}
           />
         }
       >

        {/* Exam Seats */}
        <View style={styles.section}>
          {examSeats.length > 0 && (
            <View style={styles.countContainer}>
              <Text style={[styles.countText, { color: colors.secondaryFont }]}>
                {examSeats.length} exam{examSeats.length !== 1 ? 's' : ''} scheduled
              </Text>
            </View>
          )}
          
          {examSeats.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.emptyTitle, { color: colors.mainFont }]}>No Exam Seats Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryFont }]}>
                You don&apos;t have any exam seats assigned at the moment.
              </Text>
            </View>
          ) : (
            examSeats.map((exam, index) => (
              <View
                key={index}
                 style={[
                   styles.examCard,
                   {
                     backgroundColor: colors.cardBackground,
                     borderLeftColor: getExamTypeColor(exam.examType, exam.date),
                   },
                 ]}
              >
                <View style={styles.examHeader}>
                  <View style={styles.courseInfo}>
                    <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                      {exam.courseName}
                    </Text>
                  </View>
                </View>

                <View style={styles.examDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                      {exam.examDay}, {formatExamDate(exam.date)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                      {exam.startTime} - {exam.endTime}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                      {exam.hall}
                    </Text>
                  </View>

                   <View style={styles.detailRow}>
                     <MaterialIcons name="chair-alt" size={16} color={colors.secondaryFont} />
                     <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                       Seat: {exam.seat}
                     </Text>
                   </View>
                </View>
              </View>
            ))
          )}
         </View>
       </ScrollView>
     </View>
     
     {/* Custom Alert Component */}
     <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 20,
  },
  noteContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  countContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  examCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  examHeader: {
    marginBottom: 12,
  },
  courseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  examDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
