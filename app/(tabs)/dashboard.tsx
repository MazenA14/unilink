import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const upcomingAssignments = [
    { title: 'Math 101 Assignment', dueDate: 'Due in 2 days', id: 1 },
    { title: 'History Essay', dueDate: 'Due in 4 days', id: 2 },
  ];

  const recentGrades = [
    { subject: 'Physics Exam', grade: 85, id: 1 },
    { subject: 'English Paper', grade: 92, id: 2 },
  ];

  const announcements = [
    { title: 'New Course Added', id: 1 },
    { title: 'Library Hours Extended', id: 2 },
  ];

  const quickLinks = [
    { title: 'Course Catalog', color: colors.tabColor, id: 1 },
    { title: 'Academic Calendar', color: colors.tabColor, id: 2 },
  ];

  const getGradeColor = (grade: number) => {
    if (grade >= 85) return colors.highGrade;
    if (grade >= 70) return colors.mediumGrade;
    return colors.lowGrade;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.mainFont }]}>Dashboard</Text>
        <TouchableOpacity>
          <IconSymbol name="bell" size={24} color={colors.mainFont} />
        </TouchableOpacity>
      </View>

      {/* Upcoming Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Upcoming</Text>
        {upcomingAssignments.map((assignment) => (
          <TouchableOpacity
            key={assignment.id}
            style={[styles.card, { backgroundColor: colors.background }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.fileBackground }]}>
              <IconSymbol name="doc.text" size={24} color={colors.mainFont} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.mainFont }]}>
                {assignment.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryFont }]}>
                {assignment.dueDate}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Grades Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Recent Grades</Text>
        <View style={styles.gradesContainer}>
          {recentGrades.map((grade) => (
            <TouchableOpacity
              key={grade.id}
              style={[styles.gradeCard, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.gradeSubject, { color: colors.mainFont }]}>
                {grade.subject}
              </Text>
              <Text style={[styles.gradePercent, { color: getGradeColor(grade.grade) }]}>
                {grade.grade}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Announcements Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Announcements</Text>
        {announcements.map((announcement) => (
          <TouchableOpacity
            key={announcement.id}
            style={[styles.card, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.cardTitle, { color: colors.mainFont }]}>
              {announcement.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Links Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Quick Links</Text>
        {quickLinks.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={[styles.card, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.linkText, { color: link.color }]}>
              {link.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  gradesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  gradeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradeSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  gradePercent: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
