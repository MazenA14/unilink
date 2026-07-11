import { useCustomAlert } from '@/components/CustomAlert';
import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { EvaluationHandler } from '@/utils/handlers/evaluationHandler';
import { EvaluationItem } from '@/utils/types/gucTypes';
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

export default function EvaluateCourseScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const courses = await EvaluationHandler.getCourseList();
      setItems(courses);
    } catch (error) {
      console.error('Failed to load courses to evaluate:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load courses to evaluate. Please try again.',
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

  const handleRefresh = () => loadList(true);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar title="Evaluate Course" />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading courses...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            <View style={styles.section}>
              {items.length === 0 ? (
                <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="checkmark-circle-outline" size={40} color={colors.secondaryFont} />
                  <Text style={[styles.emptyTitle, { color: colors.mainFont }]}>No Courses to Evaluate</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.secondaryFont }]}>
                    You don&apos;t have any pending course evaluations right now.
                  </Text>
                </View>
              ) : (
                items.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.itemCard, { backgroundColor: colors.cardBackground, borderLeftColor: '#F59E0B' }]}
                    onPress={() =>
                      router.push({
                        pathname: '/evaluation/form',
                        params: { type: 'course', id: item.value, name: item.text },
                      })
                    }
                  >
                    <Text style={[styles.itemText, { color: colors.mainFont }]} numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.secondaryFont} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  section: { marginBottom: 32 },
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
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  itemText: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12, lineHeight: 18 },
});
