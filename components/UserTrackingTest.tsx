import { useState } from 'react';
import { Alert, Button, Text, View } from 'react-native';
import { userTrackingService } from '../utils/services/userTrackingService';
import { supabase } from '../utils/supabase';

export default function UserTrackingTest() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    console.log('🧪 [TestComponent] Testing Supabase connection...');
    try {
      // Test basic connection
      console.log('🔍 [TestComponent] Sending test query to userdata table...');
      const { data, error } = await supabase.from('userdata').select('count').limit(1);
      
      console.log('📊 [TestComponent] Query result:', { data, error });
      
      if (error) {
        console.error('❌ [TestComponent] Connection test failed:', error);
        Alert.alert('Connection Error', error.message);
      } else {
        console.log('✅ [TestComponent] Connection test successful!');
        Alert.alert('Success', 'Connected to Supabase successfully!');
      }
    } catch (error) {
      console.error('💥 [TestComponent] Unexpected error during connection test:', error);
      Alert.alert('Error', 'Failed to connect to Supabase');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    console.log('👥 [TestComponent] Fetching all users...');
    try {
      const userData = await userTrackingService.getAllUsers();
      console.log('📊 [TestComponent] Users fetched:', userData.length, 'users');
      setUsers(userData);
    } catch (error) {
      console.error('❌ [TestComponent] Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const testUserTracking = async () => {
    setLoading(true);
    console.log('🧪 [TestComponent] Testing user tracking...');
    try {
      await userTrackingService.trackUserLogin('test_user', '12345678');
      console.log('✅ [TestComponent] User tracking test completed successfully!');
      Alert.alert('Success', 'User tracking test completed!');
    } catch (error) {
      console.error('❌ [TestComponent] User tracking test failed:', error);
      Alert.alert('Error', 'User tracking test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
        Supabase User Tracking Test
      </Text>
      
      <Button
        title={loading ? "Loading..." : "Test Connection"}
        onPress={testConnection}
        disabled={loading}
      />
      
      <View style={{ height: 10 }} />
      
      <Button
        title={loading ? "Loading..." : "Test User Tracking"}
        onPress={testUserTracking}
        disabled={loading}
      />
      
      <View style={{ height: 10 }} />
      
      <Button
        title={loading ? "Loading..." : "Fetch All Users"}
        onPress={fetchUsers}
        disabled={loading}
      />
      
      <View style={{ height: 20 }} />
      
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
        Users in Database ({users.length}):
      </Text>
      
      {users.map((user, index) => (
        <View key={index} style={{ marginVertical: 5, padding: 10, backgroundColor: '#f0f0f0' }}>
          <Text>Username: {user.username}</Text>
          <Text>GUC ID: {user.guc_id}</Text>
          <Text>Joined: {new Date(user.date_joined_app).toLocaleDateString()}</Text>
          <Text>Last Opened: {new Date(user.last_opened_date).toLocaleDateString()}</Text>
        </View>
      ))}
    </View>
  );
}
