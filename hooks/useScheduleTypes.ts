import { ScheduleData, ScheduleOption, ScheduleType } from '@/components/schedule/types';
import { getCourseOptions, getStaffAndCourseOptions, getStaffOptions, submitScheduleSelection } from '@/utils/handlers/staffScheduleHandler';
import { useEffect, useState } from 'react';

// Mock data for group schedules (not implemented yet)
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
        first: selectedId ? [{
          courseName: type === 'staff' ? 'DMET 502 Lecture (7MET L001)' : 
                     type === 'course' ? 'CS101 - Introduction to Programming' : 
                     type === 'combined' ? 'DMET 502 Lecture (7MET L001)' : 'CS101 - Programming',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 
                     type === 'combined' ? 'Dr. Ahmed Hassan' : 'Dr. Sarah Mohamed',
          room: 'Room 101',
          time: '9:00 AM - 10:30 AM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 45, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
          ...(type === 'combined' && { officeHours: '2:00 PM - 4:00 PM' }),
        }] : null,
        second: null,
        third: selectedId ? [{
          courseName: type === 'staff' ? 'CS201 - Data Structures [Tutorial]' : 
                     type === 'course' ? 'CS201 - Data Structures' : 
                     type === 'combined' ? 'CS101 - Introduction to Programming' : 'CS201 - Data Structures',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 
                     type === 'combined' ? 'Dr. Sarah Mohamed' : 'Dr. Omar Ali',
          room: 'Room 102',
          time: '11:00 AM - 12:30 PM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 38, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
          ...(type === 'combined' && { enrollmentCount: 45, credits: 3 }),
        }] : null,
        fourth: null,
        fifth: null,
        sixth: null,
        seventh: null,
        eighth: null,
      },
      isFree: false,
    },
    {
      dayName: 'Sunday',
      periods: {
        first: null,
        second: selectedId ? [{
          courseName: type === 'staff' ? 'CS301 - Algorithms - Lab' : 
                     type === 'course' ? 'CS301 - Algorithms' : 'CS301 - Algorithms',
          instructor: type === 'staff' ? 'Dr. Ahmed Hassan' : 'Dr. Ahmed Hassan',
          room: 'Room 103',
          time: '10:00 AM - 11:30 AM',
          ...(type === 'staff' && { officeHours: '2:00 PM - 4:00 PM' }),
          ...(type === 'course' && { enrollmentCount: 32, credits: 3 }),
          ...(type === 'group' && { groupSize: 120, department: 'Computer Science' }),
        }] : null,
        third: null,
        fourth: null,
        fifth: null,
        sixth: null,
        seventh: null,
        eighth: null,
      },
      isFree: false,
    },
    // Add more days as needed
    { dayName: 'Monday', periods: { first: null, second: null, third: null, fourth: null, fifth: null, sixth: null, seventh: null, eighth: null }, isFree: true },
    { dayName: 'Tuesday', periods: { first: null, second: null, third: null, fourth: null, fifth: null, sixth: null, seventh: null, eighth: null }, isFree: true },
    { dayName: 'Wednesday', periods: { first: null, second: null, third: null, fourth: null, fifth: null, sixth: null, seventh: null, eighth: null }, isFree: true },
    { dayName: 'Thursday', periods: { first: null, second: null, third: null, fourth: null, fifth: null, sixth: null, seventh: null, eighth: null }, isFree: true },
  ];

  return {
    days,
    type,
    metadata: {
      selectedItem: selectedId ? 
        (type === 'staff' ? mockStaffOptions.find(s => s.id === selectedId)?.name :
         type === 'course' ? mockCourseOptions.find(c => c.id === selectedId)?.name :
         type === 'combined' ? 'Combined Schedule' :
         mockGroupOptions.find(g => g.id === selectedId)?.name) : undefined,
      // For combined schedules, add sample metadata
      ...(type === 'combined' && {
        staffSelections: ['Dr. Ahmed Hassan', 'Dr. Sarah Mohamed'],
        courseSelections: ['CS101 - Introduction to Programming'],
        totalSelections: 3
      })
    },
  };
};

export function useScheduleTypes(initialScheduleType?: ScheduleType) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initialScheduleType || 'personal');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ScheduleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const getOptions = async (type: ScheduleType, bypassCache: boolean = false): Promise<ScheduleOption[]> => {
    switch (type) {
      case 'staff':
        try {
          setOptionsLoading(true);
          const staffOptions = await getStaffOptions(bypassCache);
          setOptions(staffOptions);
          return staffOptions;
        } catch (error) {
          console.error('Error fetching staff options:', error);
          // Use fallback mock data temporarily (TAs don't show department/additionalInfo)
          const fallbackStaffOptions: ScheduleOption[] = [
            { id: '1', name: 'Dr. Ahmed Hassan' },
            { id: '2', name: 'Dr. Sarah Mohamed' },
            { id: '3', name: 'Dr. Omar Ali' },
          ];
          setOptions(fallbackStaffOptions);
          setError('Using fallback data - Failed to load staff list');
          return fallbackStaffOptions;
        } finally {
          setOptionsLoading(false);
        }
      case 'course':
        try {
          setOptionsLoading(true);
          const courseOptions = await getCourseOptions(bypassCache);
          setOptions(courseOptions);
          return courseOptions;
        } catch (error) {
          console.error('Error fetching course options:', error);
          // Use fallback mock data temporarily
          const fallbackCourseOptions: ScheduleOption[] = [
            { id: '1', name: 'CS101 - Introduction to Programming', department: 'Computer Science', additionalInfo: '3 Credits' },
            { id: '2', name: 'MATH201 - Calculus II', department: 'Mathematics', additionalInfo: '4 Credits' },
            { id: '3', name: 'PHYS101 - General Physics', department: 'Physics', additionalInfo: '3 Credits' },
          ];
          setOptions(fallbackCourseOptions);
          setError('Using fallback data - Failed to load course list');
          return fallbackCourseOptions;
        } finally {
          setOptionsLoading(false);
        }
      case 'group':
        setOptions(mockGroupOptions);
        return mockGroupOptions;
      case 'combined':
        try {
          setOptionsLoading(true);
          const { staffOptions, courseOptions } = await getStaffAndCourseOptions(bypassCache);
          // For combined type, merge both staff and course options with a type indicator
          const combinedOptions: ScheduleOption[] = [
            ...staffOptions.map(option => ({ ...option, additionalInfo: `Staff: ${option.additionalInfo || 'Teaching Assistant'}` })),
            ...courseOptions.map(option => ({ ...option, additionalInfo: `Course: ${option.additionalInfo || 'Course'}` }))
          ];
          setOptions(combinedOptions);
          return combinedOptions;
        } catch (error) {
          console.error('Error fetching combined options:', error);
          // Use fallback mock data
          const fallbackCombinedOptions: ScheduleOption[] = [
            { id: 'staff_1', name: 'Dr. Ahmed Hassan', additionalInfo: 'Staff: Teaching Assistant' },
            { id: 'staff_2', name: 'Dr. Sarah Mohamed', additionalInfo: 'Staff: Teaching Assistant' },
            { id: 'course_1', name: 'CS101 - Introduction to Programming', department: 'Computer Science', additionalInfo: 'Course: 3 Credits' },
            { id: 'course_2', name: 'MATH201 - Calculus II', department: 'Mathematics', additionalInfo: 'Course: 4 Credits' },
          ];
          setOptions(fallbackCombinedOptions);
          setError('Using fallback data - Failed to load combined options');
          return fallbackCombinedOptions;
        } finally {
          setOptionsLoading(false);
        }
      default:
        setOptions([]);
        return [];
    }
  };

  const fetchScheduleData = async (type: ScheduleType, selectedId?: string, skipLoadingState: boolean = false, bypassCache: boolean = false) => {
    if (!skipLoadingState) {
      setLoading(true);
    }
    setError(null);
    
    try {
      let data: ScheduleData;
      
      if (type === 'personal') {
        // Use cached API for personal schedule
        const { GUCAPIProxy } = await import('../utils/gucApiProxy');
        data = await GUCAPIProxy.getScheduleData(bypassCache) as any;
      } else if (type === 'staff' || type === 'course') {
        // Use real API for staff and course schedules
        if (selectedId) {
          const selectedOption = options.find(opt => opt.id === selectedId);
          if (!selectedOption) {
            throw new Error('Selected option not found');
          }
          
          const result = await submitScheduleSelection(
            type as 'staff' | 'course',
            selectedId,
            selectedOption.name
          );
          
          data = result.scheduleData;
        } else {
          // No selection made yet, return empty schedule
          data = generateMockSchedule(type, selectedId);
        }
      } else if (type === 'combined') {
        // For combined schedules, use mock data for now
        // In a real implementation, you would need to collect multiple selections
        // and call submitMultipleScheduleSelections with arrays of staff and course IDs
        await new Promise(resolve => setTimeout(resolve, 1000));
        data = generateMockSchedule(type, selectedId);
      } else {
        // Use mock data for other schedule types (like group)
        await new Promise(resolve => setTimeout(resolve, 1000));
        data = generateMockSchedule(type, selectedId);
      }
      
      setScheduleData(data);
    } catch (err) {
      setError('Failed to load schedule data');
      setScheduleData(null);
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  const handleScheduleTypeChange = async (type: ScheduleType) => {
    setScheduleType(type);
    setSelectedOption('');
    setError(null);
    
    if (type === 'personal') {
      fetchScheduleData(type);
    } else {
      setScheduleData(null);
      // Load options for the new schedule type
      await getOptions(type);
    }
  };

  const handleOptionSelection = async (optionId: string) => {
    setSelectedOption(optionId);
    
    // For staff and course schedules, use the auto-submit functionality
    if (scheduleType === 'staff' || scheduleType === 'course') {
      setLoading(true);
      setError(null);
      
      try {
        const selectedOption = options.find(opt => opt.id === optionId);
        if (!selectedOption) {
          throw new Error('Selected option not found');
        }
        
        const result = await submitScheduleSelection(
          scheduleType as 'staff' | 'course',
          optionId,
          selectedOption.name
        );
        
        setScheduleData(result.scheduleData);
      } catch (err) {
        console.error('Error submitting schedule selection:', err);
        setError('Failed to load schedule data');
        setScheduleData(null);
      } finally {
        setLoading(false);
      }
    } else {
      // For other types, use the existing mock data approach
      fetchScheduleData(scheduleType, optionId);
    }
  };

  const refetch = async () => {
    if (scheduleType === 'personal') {
      await fetchScheduleData(scheduleType, undefined, false, true); // bypassCache = true for refresh
    } else if (selectedOption && (scheduleType === 'staff' || scheduleType === 'course')) {
      // For staff and course schedules, re-submit the selection
      setLoading(true);
      setError(null);
      
      try {
        const selectedOptionData = options.find(opt => opt.id === selectedOption);
        if (!selectedOptionData) {
          throw new Error('Selected option not found');
        }
        
        const result = await submitScheduleSelection(
          scheduleType as 'staff' | 'course',
          selectedOption,
          selectedOptionData.name
        );
        
        setScheduleData(result.scheduleData);
      } catch (err) {
        console.error('Error refreshing schedule selection:', err);
        setError('Failed to refresh schedule data');
        setScheduleData(null);
      } finally {
        setLoading(false);
      }
    } else if (selectedOption) {
      await fetchScheduleData(scheduleType, selectedOption, false, true); // bypassCache = true for refresh
    } else {
      // Refresh options if no selection made yet
      await getOptions(scheduleType, true); // bypassCache = true for refresh
    }
  };

  // Check for cached data first, then load if needed
  const loadInitialData = async () => {
    // Only load personal schedule data if we're starting with personal schedule type
    if (scheduleType === 'personal') {
      try {
        // Try to get cached data first
        const { GradeCache } = await import('../utils/gradeCache');
        const cachedData = await GradeCache.getCachedScheduleData();
        
        if (cachedData) {
          // Use cached data immediately without loading state
          setScheduleData(cachedData as any);
          setLoading(false);
          return;
        }
      } catch (error) {
        // If cache check fails, continue with normal loading
      }
      
      // No cached data or cache check failed, fetch fresh data
      fetchScheduleData('personal');
    } else {
      // For non-personal schedule types, load options and set loading to false
      setLoading(false);
      await getOptions(scheduleType);
    }
  };

  // Load initial data based on current schedule type
  useEffect(() => {
    loadInitialData();
  }, [scheduleType]);

  return {
    scheduleType,
    selectedOption,
    scheduleData,
    loading: loading || optionsLoading,
    error,
    options,
    handleScheduleTypeChange,
    handleOptionSelection,
    refetch,
  };
}
