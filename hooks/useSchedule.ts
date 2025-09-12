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
      
      const data = await GUCAPIProxy.getScheduleData();
      
      setScheduleData(data);
    } catch (err: any) {
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
