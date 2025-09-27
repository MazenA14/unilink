import { useCustomAlert } from '@/components/CustomAlert';
import { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { UserData, userTrackingService } from '../utils/services/userTrackingService';
import { supabase } from '../utils/supabase';

export default function UserTrackingTest() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test basic connection
      const { data, error } = await supabase.from('userdata').select('count').limit(1);
      
      if (error) {
        showAlert({
          title: 'Connection Error',
          message: error.message,
          type: 'error',
        });
      } else {
        showAlert({
          title: 'Success',
          message: 'Connected to Supabase successfully!',
          type: 'success',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to connect to Supabase',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const userData = await userTrackingService.getAllUsers();
      setUsers(userData);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to fetch users',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const testUserTracking = async () => {
    setLoading(true);
    try {
      await userTrackingService.trackUserLogin('test_user', '12345678');
      showAlert({
        title: 'Success',
        message: 'User tracking test completed!',
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'User tracking test failed',
        type: 'error',
      });
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
          {user.joined_season && <Text>Season: {user.joined_season}</Text>}
          {user.major && <Text>Major: {user.major}</Text>}
        </View>
      ))}
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}
