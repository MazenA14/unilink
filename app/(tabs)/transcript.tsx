import { GUCAPIProxy as GUCAPI } from '@/utils/gucApiProxy';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface StudyYear {
  value: string;
  text: string;
}

interface Course {
  semester: string;
  courseName: string;
  numericGrade: string;
  letterGrade: string;
  creditHours: string;
}

interface Semester {
  name: string;
  courses: Course[];
  semesterGPA: string;
  totalHours: string;
}

interface StudentInfo {
  name: string;
  category: string;
  appNumber: string;
  year: string;
  studyGroup: string;
}

interface TranscriptData {
  studentInfo: StudentInfo;
  semesters: Semester[];
  cumulativeGPA: string;
  studyGroup: string;
  date: string;
}

// HTML parsing function to extract transcript data
function parseTranscriptHTML(html: string): TranscriptData | null {
  try {
    // Extract student info
    const nameMatch = html.match(/<span id="[^"]*stdNmLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const categoryMatch = html.match(/<span id="[^"]*catLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const appNoMatch = html.match(/<span id="[^"]*appNoLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const yearMatch = html.match(/<span id="[^"]*stdYrLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const studyGroupMatch = html.match(/<span id="[^"]*sgTopLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    
    // Extract cumulative GPA
    const cumulativeGPAMatch = html.match(/<span id="[^"]*cmGpaLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const dateMatch = html.match(/<span id="[^"]*dtLbl[^"]*"[^>]*>([^<]+)<\/span>/);
    const studyGroupCumulativeMatch = html.match(/<span id="[^"]*stdSgLbl[^"]*"[^>]*>([^<]+)<\/span>/);

    const studentInfo: StudentInfo = {
      name: nameMatch ? nameMatch[1].trim() : '',
      category: categoryMatch ? categoryMatch[1].trim() : '',
      appNumber: appNoMatch ? appNoMatch[1].trim() : '',
      year: yearMatch ? yearMatch[1].trim() : '',
      studyGroup: studyGroupMatch ? studyGroupMatch[1].trim() : '',
    };

    // Extract semesters
    const semesters: Semester[] = [];
    const semesterTables = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];
    
    for (const table of semesterTables) {
      // Extract semester name
      const semesterNameMatch = table.match(/<font size="3"><strong>([^<]+)<\/strong><\/font>/);
      if (!semesterNameMatch) continue;
      
      const semesterName = semesterNameMatch[1].trim();
      
      // Extract courses
      const courses: Course[] = [];
      const courseRows = table.match(/<tr>[\s\S]*?<\/tr>/g) || [];
      
      for (const row of courseRows) {
        // Check if this row contains course data (has semester code like CSE05)
        const semesterCodeMatch = row.match(/<span id="[^"]*smLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        if (!semesterCodeMatch) continue;
        
        const courseNameMatch = row.match(/<span id="[^"]*crsNmLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const numericGradeMatch = row.match(/<span id="[^"]*deLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const letterGradeMatch = row.match(/<span id="[^"]*usLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        const creditHoursMatch = row.match(/<span id="[^"]*hLbl[^"]*"[^>]*>([^<]+)<\/span>/);
        
        if (courseNameMatch && numericGradeMatch && letterGradeMatch && creditHoursMatch) {
          courses.push({
            semester: semesterCodeMatch[1].trim(),
            courseName: courseNameMatch[1].trim(),
            numericGrade: numericGradeMatch[1].trim(),
            letterGrade: letterGradeMatch[1].trim(),
            creditHours: creditHoursMatch[1].trim(),
          });
        }
      }
      
      // Extract semester GPA and total hours
      const semesterGPAMatch = table.match(/<span id="[^"]*ssnGpLbl[^"]*"[^>]*>([^<]+)<\/span>/);
      const totalHoursMatch = table.match(/<span id="[^"]*ssnThLbl[^"]*"[^>]*>([^<]+)<\/span>/);
      
      if (courses.length > 0) {
        semesters.push({
          name: semesterName,
          courses,
          semesterGPA: semesterGPAMatch ? semesterGPAMatch[1].trim() : '',
          totalHours: totalHoursMatch ? totalHoursMatch[1].trim() : '',
        });
      }
    }

    return {
      studentInfo,
      semesters,
      cumulativeGPA: cumulativeGPAMatch ? cumulativeGPAMatch[1].trim() : '',
      studyGroup: studyGroupCumulativeMatch ? studyGroupCumulativeMatch[1].trim() : '',
      date: dateMatch ? dateMatch[1].trim() : '',
    };
  } catch (error) {
    console.error('Error parsing transcript HTML:', error);
    return null;
  }
}

export default function TranscriptScreen() {
  // State management
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StudyYear | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptData | null>(null);
  
  // Loading states
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load study years on component mount
  useEffect(() => {
    loadStudyYears();
  }, []);

  const loadStudyYears = async (forceRefresh: boolean = false) => {
    try {
      setLoadingYears(true);
      
      console.log('Loading study years from API with server overload bypass...');
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      
      setStudyYears(fetchedYears);
      console.log(`Loaded ${fetchedYears.length} study years`);
      
    } catch (error: any) {
      console.error('Failed to load study years:', error);
      Alert.alert(
        'Error',
        `Failed to load study years: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearSelect = async (year: StudyYear) => {
    console.log('=== YEAR SELECTED ===');
    console.log('Selected year:', year);
    console.log('Year value:', year.value);
    console.log('Year text:', year.text);
    
    setSelectedYear(year);
    setParsedTranscript(null); // Clear previous data
    
    try {
      setLoadingTranscript(true);
      console.log('=== LOADING TRANSCRIPT DATA ===');
      console.log(`Calling GUCAPI.getTranscriptData with year value: "${year.value}"`);
      
      // Call the existing getTranscriptData function
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      
      console.log('=== TRANSCRIPT DATA LOADED SUCCESSFULLY ===');
      console.log('Raw transcript data received:', transcriptData);
      console.log('Data type:', typeof transcriptData);
      console.log('Data keys:', transcriptData ? Object.keys(transcriptData) : 'No keys (null/undefined)');
      
      if (transcriptData && transcriptData.html) {
        console.log('HTML content length:', transcriptData.html.length);
        console.log('HTML preview (first 500 chars):', transcriptData.html.substring(0, 500));
      }
      
      if (transcriptData && transcriptData.body) {
        console.log('Body content length:', transcriptData.body.length);
        console.log('Body preview (first 500 chars):', transcriptData.body.substring(0, 500));
      }
      
      console.log('=== TRANSCRIPT DATA SET IN STATE ===');
      
      // Parse the HTML content
      const htmlContent = transcriptData.html || transcriptData.body;
      if (htmlContent) {
        const parsed = parseTranscriptHTML(htmlContent);
        setParsedTranscript(parsed);
        console.log('=== PARSED TRANSCRIPT DATA ===');
        console.log('Parsed transcript:', parsed);
      }
      
    } catch (error: any) {
      console.log('=== TRANSCRIPT DATA LOADING FAILED ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error name:', error?.name);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || 'Unknown error occurred';
      console.log('Processed error message:', errorMessage);
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        console.log('Session expired error detected - showing session expired alert');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('User acknowledged session expired alert');
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
        console.log('Generic error detected - showing generic error alert');
        Alert.alert(
          'Error',
          `Failed to load transcript data: ${errorMessage}`,
          [{ 
            text: 'OK',
            onPress: () => {
              console.log('User acknowledged error alert');
            }
          }]
        );
      }
    } finally {
      setLoadingTranscript(false);
      console.log('=== TRANSCRIPT LOADING COMPLETED ===');
      console.log('Loading state set to false');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudyYears(true);
    setRefreshing(false);
  }, []);

  const renderYearItem = ({ item }: { item: StudyYear }) => (
    <TouchableOpacity
      style={[
        styles.yearCard,
        {
          backgroundColor: selectedYear?.value === item.value ? '#007AFF' : '#F2F2F7',
          borderColor: selectedYear?.value === item.value ? '#007AFF' : '#E5E5EA',
        },
      ]}
      onPress={() => handleYearSelect(item)}
    >
      <Text
        style={[
          styles.yearText,
          {
            color: selectedYear?.value === item.value ? '#FFFFFF' : '#1C1C1E',
          },
        ]}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  const getGradeColor = (grade: string): string => {
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 3.7) return '#34C759'; // Green for A grades
    if (numericGrade >= 3.0) return '#30D158'; // Light green for B grades
    if (numericGrade >= 2.0) return '#FF9500'; // Orange for C grades
    return '#FF3B30'; // Red for D/F grades
  };

  const renderCourseRow = (course: Course, index: number) => (
    <View key={index} style={[styles.courseRow, { borderBottomColor: '#E5E5EA' }]}>
      <View style={styles.courseSemester}>
        <Text style={[styles.courseText, { color: '#8E8E93' }]}>{course.semester}</Text>
      </View>
      <View style={styles.courseName}>
        <Text style={[styles.courseText, { color: '#1C1C1E' }]}>{course.courseName}</Text>
      </View>
      <View style={styles.courseNumeric}>
        <Text style={[styles.courseText, { color: getGradeColor(course.numericGrade) }]}>{course.numericGrade}</Text>
      </View>
      <View style={styles.courseGrade}>
        <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(course.numericGrade) }]}>
          <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{course.letterGrade}</Text>
        </View>
      </View>
      <View style={styles.courseHours}>
        <Text style={[styles.courseText, { color: '#8E8E93' }]}>{course.creditHours}</Text>
      </View>
    </View>
  );

  const renderSemesterTable = (semester: Semester, index: number) => (
    <View key={index} style={[styles.semesterTable, { backgroundColor: '#FFFFFF', borderColor: '#E5E5EA' }]}>
      <View style={[styles.semesterHeader, { backgroundColor: '#007AFF' }]}>
        <Text style={[styles.semesterTitle, { color: '#FFFFFF' }]}>{semester.name}</Text>
      </View>
      
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: '#F2F2F7' }]}>
        <View style={styles.courseSemester}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Code</Text>
        </View>
        <View style={styles.courseName}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Course</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Grade</Text>
        </View>
        <View style={styles.courseGrade}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Letter</Text>
        </View>
        <View style={styles.courseHours}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Hours</Text>
        </View>
      </View>
      
      {/* Course Rows */}
      {semester.courses.map((course, courseIndex) => renderCourseRow(course, courseIndex))}
      
      {/* Semester Summary */}
      <View style={[styles.semesterSummary, { backgroundColor: '#F2F2F7' }]}>
        <View style={styles.courseSemester}></View>
        <View style={styles.courseName}>
          <Text style={[styles.summaryText, { color: '#1C1C1E' }]}>Semester GPA</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.summaryText, styles.boldText, { color: '#007AFF' }]}>{semester.semesterGPA}</Text>
        </View>
        <View style={styles.courseGrade}></View>
        <View style={styles.courseHours}>
          <Text style={[styles.summaryText, { color: '#8E8E93' }]}>{semester.totalHours}h</Text>
        </View>
      </View>
    </View>
  );

  const renderCumulativeGPA = () => {
    if (!parsedTranscript) return null;
    
    return (
      <View style={[styles.cumulativeGPACard, { backgroundColor: '#007AFF' }]}>
        <View style={styles.gpaHeader}>
          <Text style={[styles.cumulativeGPATitle, { color: '#FFFFFF' }]}>
            Cumulative GPA
          </Text>
          <Text style={[styles.cumulativeGPAText, { color: '#FFFFFF' }]}>
            {parsedTranscript.studyGroup}
          </Text>
        </View>
        <View style={styles.gpaValue}>
          <Text style={[styles.cumulativeGPANumber, { color: '#FFFFFF' }]}>
            {parsedTranscript.cumulativeGPA}
          </Text>
        </View>
        <Text style={[styles.cumulativeGPADate, { color: '#FFFFFF' }]}>
          Updated {parsedTranscript.date}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#F2F2F7' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: '#1C1C1E' }]}>Academic Transcript</Text>
        <Text style={[styles.subtitle, { color: '#8E8E93' }]}>
          View your academic performance by study year
        </Text>
      </View>

      {/* Study Years Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Select Study Year</Text>
        {loadingYears ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: '#8E8E93' }]}>
              {refreshing ? 'Refreshing...' : 'Loading study years...'}
            </Text>
          </View>
        ) : studyYears.length > 0 ? (
          <FlatList
            data={studyYears}
            renderItem={renderYearItem}
            keyExtractor={(year) => year.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.yearsList}
            contentContainerStyle={styles.yearsListContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: '#1C1C1E' }]}>No Study Years Available</Text>
            <Text style={[styles.emptyText, { color: '#8E8E93' }]}>
              No study years were found in your transcript.
            </Text>
          </View>
        )}
      </View>

      {/* Selected Year Display */}
      {selectedYear && (
        <View style={styles.section}>
          <View style={styles.selectedYearContainer}>
            <Text style={[styles.selectedYearTitle, { color: '#1C1C1E' }]}>
              {selectedYear.text}
            </Text>
            
            {loadingTranscript ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={[styles.loadingText, { color: '#8E8E93' }]}>
                  Loading transcript data...
                </Text>
              </View>
            ) : parsedTranscript ? (
              <View style={styles.transcriptContainer}>
                {/* Transcript Tables */}
                <View style={styles.tablesContainer}>
                  {parsedTranscript.semesters.map((semester, index) => renderSemesterTable(semester, index))}
                </View>
                
                {/* Cumulative GPA */}
                {renderCumulativeGPA()}
              </View>
            ) : (
              <Text style={[styles.selectedYearSubtitle, { color: '#8E8E93' }]}>
                Select a study year to view transcript
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Coming Soon Section for when no year is selected */}
      {!selectedYear && (
        <View style={styles.comingSoonContainer}>
          <Text style={[styles.comingSoonTitle, { color: '#1C1C1E' }]}>
            Select a Study Year
          </Text>
          <Text style={[styles.comingSoonText, { color: '#8E8E93' }]}>
            Choose a study year from above to view your detailed academic transcript
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  yearsList: {
    marginBottom: 10,
  },
  yearsListContent: {
    paddingHorizontal: 4,
  },
  yearCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  selectedYearContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedYearTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedYearSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcriptContainer: {
    marginTop: 16,
    width: '100%',
  },
  // New styles for transcript tables
  tablesContainer: {
    marginBottom: 20,
  },
  semesterTable: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  semesterHeader: {
    padding: 16,
    alignItems: 'center',
  },
  semesterTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  courseRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  semesterSummary: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  courseSemester: {
    flex: 0.8,
    alignItems: 'center',
  },
  courseName: {
    flex: 2.5,
    paddingHorizontal: 4,
  },
  courseNumeric: {
    flex: 0.6,
    alignItems: 'center',
  },
  courseGrade: {
    flex: 0.6,
    alignItems: 'center',
  },
  courseHours: {
    flex: 0.6,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  courseText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
  },
  cumulativeGPACard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gpaHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cumulativeGPATitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cumulativeGPAText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  gpaValue: {
    marginBottom: 12,
  },
  cumulativeGPANumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  cumulativeGPADate: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
});