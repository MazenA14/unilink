import { useCustomAlert } from '@/components/CustomAlert';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Course, CourseWeight, CourseWeightsStorage } from '@/utils/courseWeightsStorage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function CourseWeightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  const [courses, setCourses] = useState<Course[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingWeight, setEditingWeight] = useState<CourseWeight | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [presetDropdownVisible, setPresetDropdownVisible] = useState(false);
  const [percentageDropdownVisible, setPercentageDropdownVisible] = useState(false);
  
  // Form states
  const [courseName, setCourseName] = useState('');
  const [weightName, setWeightName] = useState('');
  const [weightPercentage, setWeightPercentage] = useState('');

  // Preset weight names (alphabetically ordered)
  const presetWeightNames = [
    'Assignments',
    'Final',
    'Labs',
    'Midterm',
    'Projects',
    'Quizzes'
  ];

  // Preset percentage values (common weight distributions)
  const presetPercentages = [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
  ];

  const loadCourses = useCallback(async () => {
    try {
      const loadedCourses = await CourseWeightsStorage.loadCourses();
      setCourses(loadedCourses);
    } catch {
      // Error handling will be done in the calling function if needed
      console.error('Failed to load courses');
    }
  }, []);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const saveCourses = useCallback(async (updatedCourses: Course[]) => {
    try {
      await CourseWeightsStorage.saveCourses(updatedCourses);
      setCourses(updatedCourses);
    } catch {
      // Error handling will be done in the calling function if needed
      console.error('Failed to save courses');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCourses();
    } catch (error) {
      console.error('Failed to refresh courses:', error);
      // Error handling will be done by the calling component if needed
    } finally {
      setRefreshing(false);
    }
  }, [loadCourses]);

  // Course management functions
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseName('');
    setCourseModalVisible(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseModalVisible(true);
  };

  const handleDeleteCourse = (courseId: string) => {
    showAlert({
      title: 'Delete Course',
      message: 'Are you sure you want to delete this course and all its weights?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCourses = courses.filter(course => course.id !== courseId);
            saveCourses(updatedCourses);
          }
        }
      ]
    });
  };

  const handleSaveCourse = () => {
    if (!courseName.trim()) {
      showAlert({
        title: 'Error',
        message: 'Course name cannot be empty',
        type: 'error',
      });
      return;
    }

    const updatedCourses = [...courses];
    
    if (editingCourse) {
      // Update existing course
      const courseIndex = updatedCourses.findIndex(c => c.id === editingCourse.id);
      if (courseIndex !== -1) {
        updatedCourses[courseIndex] = { ...editingCourse, name: courseName.trim() };
      }
    } else {
      // Add new course
      const newCourse: Course = {
        id: Date.now().toString(),
        name: courseName.trim(),
        weights: []
      };
      updatedCourses.push(newCourse);
    }
    
    saveCourses(updatedCourses);
    setCourseModalVisible(false);
    setCourseName('');
    setEditingCourse(null);
  };

  // Weight management functions
  const handleAddWeight = (course: Course) => {
    setSelectedCourse(course);
    setEditingWeight(null);
    setWeightName('');
    setWeightPercentage('');
    setWeightModalVisible(true);
  };

  const handleEditWeight = (course: Course, weight: CourseWeight) => {
    setSelectedCourse(course);
    setEditingWeight(weight);
    setWeightName(weight.name);
    setWeightPercentage(weight.percentage.toString());
    setWeightModalVisible(true);
  };

  const handleDeleteWeight = (courseId: string, weightId: string) => {
    showAlert({
      title: 'Delete Weight',
      message: 'Are you sure you want to delete this weight?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCourses = courses.map(course => {
              if (course.id === courseId) {
                return {
                  ...course,
                  weights: course.weights.filter(weight => weight.id !== weightId)
                };
              }
              return course;
            });
            saveCourses(updatedCourses);
          }
        }
      ]
    });
  };

  const handlePresetSelect = (presetName: string) => {
    setWeightName(presetName);
    setPresetDropdownVisible(false);
  };

  const handlePercentagePresetSelect = (percentage: number) => {
    setWeightPercentage(percentage.toString());
    setPercentageDropdownVisible(false);
  };

  const handleDeleteAllCourses = () => {
    if (courses.length === 0) {
      showAlert({
        title: 'No Courses',
        message: 'There are no courses to delete',
        type: 'info',
      });
      return;
    }

    showAlert({
      title: 'Delete All Courses',
      message: `Are you sure you want to delete all courses and their weights? This action cannot be undone.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await CourseWeightsStorage.clearAll();
              setCourses([]);
            } catch (error) {
              console.error('Failed to delete all courses:', error);
              showAlert({
                title: 'Error',
                message: 'Failed to delete all courses',
                type: 'error',
              });
            }
          }
        }
      ]
    });
  };

  const handleSaveWeight = () => {
    if (!weightName.trim() || !weightPercentage.trim()) {
      showAlert({
        title: 'Error',
        message: 'Weight name and percentage are required',
        type: 'error',
      });
      return;
    }

    const percentage = parseFloat(weightPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      showAlert({
        title: 'Error',
        message: 'Percentage must be a number between 0 and 100',
        type: 'error',
      });
      return;
    }

    if (!selectedCourse) return;

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourse.id) {
        const updatedWeights = [...course.weights];
        
        if (editingWeight) {
          // Update existing weight
          const weightIndex = updatedWeights.findIndex(w => w.id === editingWeight.id);
          if (weightIndex !== -1) {
            updatedWeights[weightIndex] = {
              ...editingWeight,
              name: weightName.trim(),
              percentage
            };
          }
        } else {
          // Add new weight
          const newWeight: CourseWeight = {
            id: Date.now().toString(),
            name: weightName.trim(),
            percentage
          };
          updatedWeights.push(newWeight);
        }
        
        return { ...course, weights: updatedWeights };
      }
      return course;
    });
    
    saveCourses(updatedCourses);
    setWeightModalVisible(false);
    setWeightName('');
    setWeightPercentage('');
    setEditingWeight(null);
    setSelectedCourse(null);
    setPresetDropdownVisible(false);
    setPercentageDropdownVisible(false);
  };

  const renderWeightItem = ({ item: weight }: { item: CourseWeight }) => {
    const course = selectedCourse || courses.find(c => c.weights.some(w => w.id === weight.id));
    if (!course) return null;

    return (
      <View style={[styles.weightItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.weightInfo}>
          <Text style={[styles.weightName, { color: colors.text }]}>{weight.name}</Text>
          <Text style={[styles.weightPercentage, { color: colors.secondaryFont }]}>{weight.percentage}%</Text>
        </View>
        <View style={styles.weightActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
            onPress={() => handleEditWeight(course, weight)}
          >
            <Ionicons name="pencil" size={16} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleDeleteWeight(course.id, weight.id)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCourseItem = ({ item: course }: { item: Course }) => (
    <View style={[styles.courseCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.courseHeader}>
        <Text style={[styles.courseName, { color: colors.text }]}>{course.name}</Text>
        <View style={styles.courseActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
            onPress={() => handleEditCourse(course)}
          >
            <Ionicons name="pencil" size={16} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleDeleteCourse(course.id)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.weightsSection}>
        <View style={styles.weightsHeader}>
          <Text style={[styles.weightsTitle, { color: colors.text }]}>Weights</Text>
          <TouchableOpacity
            style={[styles.addWeightButton, { backgroundColor: colors.tint }]}
            onPress={() => handleAddWeight(course)}
          >
            <Ionicons name="add" size={16} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
        
        {course.weights.length > 0 ? (
          <FlatList
            data={course.weights}
            renderItem={renderWeightItem}
            keyExtractor={(weight) => weight.id}
            scrollEnabled={false}
            style={styles.weightsList}
          />
        ) : (
          <Text style={[styles.emptyWeights, { color: colors.secondaryFont }]}>
            No weights added yet
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Course Weights</Text>
            <View style={styles.headerButtons}>
              {courses.length > 0 && (
                <TouchableOpacity
                  style={[styles.deleteAllButton, { backgroundColor: colors.error }]}
                  onPress={handleDeleteAllCourses}
                >
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.tint }]}
                onPress={handleAddCourse}
              >
                <Ionicons name="add" size={24} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Courses List */}
        {courses.length > 0 ? (
          <FlatList
            data={courses}
            renderItem={renderCourseItem}
            keyExtractor={(course) => course.id}
            scrollEnabled={false}
            style={styles.coursesList}
            contentContainerStyle={styles.coursesListContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={colors.secondaryFont} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Courses</Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.secondaryFont }]}>
              Add your first course to start managing weights
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Course Modal */}
      <Modal
        visible={courseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCourse ? 'Edit Course' : 'Add Course'}
            </Text>
            
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Course name"
              placeholderTextColor={colors.secondaryFont}
              value={courseName}
              onChangeText={setCourseName}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setCourseModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveCourse}
              >
                <Text style={[styles.modalButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Modal */}
      <Modal
        visible={weightModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingWeight ? 'Edit Weight' : 'Add Weight'}
            </Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputWithDropdown}>
                <TextInput
                  style={[styles.textInputWithButton, { 
                    backgroundColor: colors.background, 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="Weight name"
                  placeholderTextColor={colors.secondaryFont}
                  value={weightName}
                  onChangeText={setWeightName}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.presetButton, { 
                    backgroundColor: colors.tint + '20',
                    borderColor: colors.border 
                  }]}
                  onPress={() => setPresetDropdownVisible(!presetDropdownVisible)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={presetDropdownVisible ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={colors.tint} 
                  />
                </TouchableOpacity>
              </View>
              
              {presetDropdownVisible && (
                <View style={[styles.presetDropdown, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border 
                }]}>
                  <ScrollView 
                    style={styles.presetScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {presetWeightNames.map((presetName) => (
                      <TouchableOpacity
                        key={presetName}
                        style={[styles.presetItem, { 
                          borderBottomColor: colors.border 
                        }]}
                        onPress={() => handlePresetSelect(presetName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetText, { color: colors.text }]}>
                          {presetName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputWithDropdown}>
                <TextInput
                  style={[styles.textInputWithButton, { 
                    backgroundColor: colors.background, 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="Percentage"
                  placeholderTextColor={colors.secondaryFont}
                  value={weightPercentage}
                  onChangeText={setWeightPercentage}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.presetButton, { 
                    backgroundColor: colors.tint + '20',
                    borderColor: colors.border 
                  }]}
                  onPress={() => setPercentageDropdownVisible(!percentageDropdownVisible)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={percentageDropdownVisible ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={colors.tint} 
                  />
                </TouchableOpacity>
              </View>
              
              {percentageDropdownVisible && (
                <View style={[styles.presetDropdown, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border 
                }]}>
                  <ScrollView 
                    style={styles.presetScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {presetPercentages.map((percentage) => (
                      <TouchableOpacity
                        key={percentage}
                        style={[styles.presetItem, { 
                          borderBottomColor: colors.border 
                        }]}
                        onPress={() => handlePercentagePresetSelect(percentage)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetText, { color: colors.text }]}>
                          {percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setWeightModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveWeight}
              >
                <Text style={[styles.modalButtonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: -6,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coursesList: {
    flex: 1,
  },
  coursesListContent: {
    padding: 20,
    paddingTop: 0,
  },
  courseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  courseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  weightsSection: {
    marginTop: 8,
  },
  weightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weightsTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  addWeightButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightsList: {
    marginTop: 8,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  weightInfo: {
    flex: 1,
  },
  weightName: {
    fontSize: 14,
    fontWeight: '500',
  },
  weightPercentage: {
    fontSize: 12,
    marginTop: 2,
  },
  weightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWeights: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  inputWithDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputWithButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  presetButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 48,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  presetScrollView: {
    maxHeight: 200,
  },
  presetItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  presetText: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
