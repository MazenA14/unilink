import { GUCAPIProxy, ScheduleData } from '@/utils/gucApiProxy';
import { useEffect, useState } from 'react';

export function useSchedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching schedule data...');
      const data = await GUCAPIProxy.getScheduleData();
      
      console.log('Schedule data fetched successfully:', data);
      setScheduleData(data);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const refetch = () => {
    fetchSchedule();
  };

  return {
    scheduleData,
    loading,
    error,
    refetch,
  };
}
