import { ScheduleData, ScheduleOption, ScheduleType } from '@/components/schedule/types';
import { useEffect, useState } from 'react';

// Mock data for demonstration - replace with actual API calls
const mockStaffOptions: ScheduleOption[] = [
  { id: '1', name: 'Dr. Ahmed Hassan', department: 'Computer Science', additionalInfo: 'Professor' },
  { id: '2', name: 'Dr. Sarah Mohamed', department: 'Mathematics', additionalInfo: 'Associate Professor' },
  { id: '3', name: 'Dr. Omar Ali', department: 'Physics', additionalInfo: 'Assistant Professor' },
];

const mockCourseOptions: ScheduleOption[] = [
  { id: '1', name: 'CS101 - Introduction to Programming', department: 'Computer Science', additionalInfo: '3 Credits' },
  { id: '2', name: 'MATH201 - Calculus II', department: 'Mathematics', additionalInfo: '4 Credits' },
  { id: '3', name: 'PHYS101 - General Physics', department: 'Physics', additionalInfo: '3 Credits' },
];

const mockGroupOptions: ScheduleOption[] = [
  { id: '1', name: 'Computer Science Department', department: 'CS', additionalInfo: 'All CS Students' },
  { id: '2', name: 'Engineering Group A', department: 'Engineering', additionalInfo: 'First Year Students' },
  { id: '3', name: 'Mathematics Department', department: 'Math', additionalInfo: 'All Math Students' },
];

// Mock schedule data generator
const generateMockSchedule = (type: ScheduleType, selectedId?: string): ScheduleData => {
  const days = [
    {
      dayName: 'Saturday',
      periods: {
        first: selectedId ? {
          courseName: type === 'staff' ? 'CS101 - Programming' : 
                     type === 'course' ? 'CS101 - Introduction to Programming' : 'CS101 - Programming',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 'Dr. Sarah Mohamed',
          room: 'Room 101',
          time: '9:00 AM - 10:30 AM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 45, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
        } : null,
        second: null,
        third: selectedId ? {
          courseName: type === 'staff' ? 'CS201 - Data Structures' : 
                     type === 'course' ? 'CS201 - Data Structures' : 'CS201 - Data Structures',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 'Dr. Omar Ali',
          room: 'Room 102',
          time: '11:00 AM - 12:30 PM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 38, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
        } : null,
        fourth: null,
        fifth: null,
      },
      isFree: false,
    },
    {
      dayName: 'Sunday',
      periods: {
        first: null,
        second: selectedId ? {
          courseName: type === 'staff' ? 'CS301 - Algorithms' : 
                     type === 'course' ? 'CS301 - Algorithms' : 'CS301 - Algorithms',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 'Dr. Ahmed Hassan',
          room: 'Room 103',
          time: '10:00 AM - 11:30 AM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 32, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
        } : null,
        third: null,
        fourth: null,
        fifth: null,
      },
      isFree: false,
    },
    // Add more days as needed
    { dayName: 'Monday', periods: { first: null, second: null, third: null, fourth: null, fifth: null }, isFree: true },
    { dayName: 'Tuesday', periods: { first: null, second: null, third: null, fourth: null, fifth: null }, isFree: true },
    { dayName: 'Wednesday', periods: { first: null, second: null, third: null, fourth: null, fifth: null }, isFree: true },
    { dayName: 'Thursday', periods: { first: null, second: null, third: null, fourth: null, fifth: null }, isFree: true },
  ];

  return {
    days,
    type,
    metadata: {
      selectedItem: selectedId ? 
        (type === 'staff' ? mockStaffOptions.find(s => s.id === selectedId)?.name :
         type === 'course' ? mockCourseOptions.find(c => c.id === selectedId)?.name :
         mockGroupOptions.find(g => g.id === selectedId)?.name) : undefined,
    },
  };
};

export function useScheduleTypes() {
  const [scheduleType, setScheduleType] = useState<ScheduleType>('personal');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOptions = (type: ScheduleType): ScheduleOption[] => {
    switch (type) {
      case 'staff':
        return mockStaffOptions;
      case 'course':
        return mockCourseOptions;
      case 'group':
        return mockGroupOptions;
      default:
        return [];
    }
  };

  const fetchScheduleData = async (type: ScheduleType, selectedId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let data: ScheduleData;
      
      if (type === 'personal') {
        // Use cached API for personal schedule
        const { GUCAPIProxy } = await import('../utils/gucApiProxy');
        data = await GUCAPIProxy.getScheduleData();
      } else {
        // Use mock data for other schedule types
        await new Promise(resolve => setTimeout(resolve, 1000));
        data = generateMockSchedule(type, selectedId);
      }
      
      setScheduleData(data);
    } catch (err) {
      setError('Failed to load schedule data');
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setSelectedOption('');
    
    if (type === 'personal') {
      fetchScheduleData(type);
    } else {
      setScheduleData(null);
    }
  };

  const handleOptionSelection = (optionId: string) => {
    setSelectedOption(optionId);
    fetchScheduleData(scheduleType, optionId);
  };

  const refetch = async () => {
    if (scheduleType === 'personal') {
      await fetchScheduleData(scheduleType);
    } else if (selectedOption) {
      await fetchScheduleData(scheduleType, selectedOption);
    }
  };

  // Load personal schedule on mount
  useEffect(() => {
    fetchScheduleData('personal');
  }, []);

  return {
    scheduleType,
    selectedOption,
    scheduleData,
    loading,
    error,
    options: getOptions(scheduleType),
    handleScheduleTypeChange,
    handleOptionSelection,
    refetch,
  };
}
