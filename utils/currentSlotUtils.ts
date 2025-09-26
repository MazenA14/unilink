/**
 * Utility functions for determining the current time slot in the schedule
 */

export interface TimeSlot {
  key: string;
  name: string;
  startTime: string;
  endTime: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/**
 * Get all time slots based on shifted schedule setting
 * For display purposes - shows original class periods
 */
export function getTimeSlots(isShiftedScheduleEnabled: boolean): TimeSlot[] {
  const slots = [
    {
      key: 'first',
      name: '1st',
      startTime: '8:15',
      endTime: '9:45',
      startHour: 8,
      startMinute: 15,
      endHour: 9,
      endMinute: 45,
    },
    {
      key: 'second',
      name: '2nd',
      startTime: '10:00',
      endTime: '11:30',
      startHour: 10,
      startMinute: 0,
      endHour: 11,
      endMinute: 30,
    },
    {
      key: 'third',
      name: '3rd',
      startTime: isShiftedScheduleEnabled ? '12:00' : '11:45',
      endTime: isShiftedScheduleEnabled ? '1:30' : '1:15',
      startHour: isShiftedScheduleEnabled ? 12 : 11,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 13 : 13,
      endMinute: isShiftedScheduleEnabled ? 30 : 15,
    },
    {
      key: 'fourth',
      name: '4th',
      startTime: isShiftedScheduleEnabled ? '2:00' : '1:45',
      endTime: isShiftedScheduleEnabled ? '3:30' : '3:15',
      startHour: isShiftedScheduleEnabled ? 14 : 13,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 15 : 15,
      endMinute: isShiftedScheduleEnabled ? 30 : 15,
    },
    {
      key: 'fifth',
      name: '5th',
      startTime: isShiftedScheduleEnabled ? '4:00' : '3:45',
      endTime: isShiftedScheduleEnabled ? '5:30' : '5:15',
      startHour: isShiftedScheduleEnabled ? 16 : 15,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 17 : 17,
      endMinute: isShiftedScheduleEnabled ? 30 : 15,
    },
  ];

  return slots;
}

/**
 * Get extended time slots for indicator purposes
 * Slots are extended backwards to cover gaps between periods
 */
export function getExtendedTimeSlots(isShiftedScheduleEnabled: boolean): TimeSlot[] {
  const slots = [
    {
      key: 'first',
      name: '1st',
      startTime: '8:15',
      endTime: '10:00', // Extended to cover the break
      startHour: 8,
      startMinute: 15,
      endHour: 10,
      endMinute: 0,
    },
    {
      key: 'second',
      name: '2nd',
      startTime: '10:00',
      endTime: isShiftedScheduleEnabled ? '12:00' : '11:45', // Extended to cover the break
      startHour: 10,
      startMinute: 0,
      endHour: isShiftedScheduleEnabled ? 12 : 11,
      endMinute: isShiftedScheduleEnabled ? 0 : 45,
    },
    {
      key: 'third',
      name: '3rd',
      startTime: isShiftedScheduleEnabled ? '12:00' : '11:45',
      endTime: isShiftedScheduleEnabled ? '2:00' : '1:45', // Extended to cover the break
      startHour: isShiftedScheduleEnabled ? 12 : 11,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 14 : 13,
      endMinute: isShiftedScheduleEnabled ? 0 : 45,
    },
    {
      key: 'fourth',
      name: '4th',
      startTime: isShiftedScheduleEnabled ? '2:00' : '1:45',
      endTime: isShiftedScheduleEnabled ? '4:00' : '3:45', // Extended to cover the break
      startHour: isShiftedScheduleEnabled ? 14 : 13,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 16 : 15,
      endMinute: isShiftedScheduleEnabled ? 0 : 45,
    },
    {
      key: 'fifth',
      name: '5th',
      startTime: isShiftedScheduleEnabled ? '4:00' : '3:45',
      endTime: isShiftedScheduleEnabled ? '5:30' : '5:15',
      startHour: isShiftedScheduleEnabled ? 16 : 15,
      startMinute: isShiftedScheduleEnabled ? 0 : 45,
      endHour: isShiftedScheduleEnabled ? 17 : 17,
      endMinute: isShiftedScheduleEnabled ? 30 : 15,
    },
  ];

  return slots;
}

/**
 * Get the current time slot based on current time and shifted schedule setting
 * Uses extended slots for indicator purposes (covers break periods)
 * Returns null if current time is outside of all slots
 */
export function getCurrentTimeSlot(isShiftedScheduleEnabled: boolean, currentTime?: Date): TimeSlot | null {
  const now = currentTime || new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const timeSlots = getExtendedTimeSlots(isShiftedScheduleEnabled);

  for (const slot of timeSlots) {
    const slotStartInMinutes = slot.startHour * 60 + slot.startMinute;
    const slotEndInMinutes = slot.endHour * 60 + slot.endMinute;

    if (currentTimeInMinutes >= slotStartInMinutes && currentTimeInMinutes <= slotEndInMinutes) {
      return slot;
    }
  }

  return null;
}

/**
 * Check if a specific time slot is the current time slot
 */
export function isCurrentTimeSlot(slotKey: string, isShiftedScheduleEnabled: boolean, currentTime?: Date): boolean {
  const currentSlot = getCurrentTimeSlot(isShiftedScheduleEnabled, currentTime);
  const isCurrent = currentSlot?.key === slotKey;
  
  // if (isCurrent) {
  //   console.log(`isCurrentTimeSlot: ${slotKey} is current slot at ${currentTime?.toLocaleTimeString() || new Date().toLocaleTimeString()}`);
  // }
  
  return isCurrent;
}

/**
 * Get the next upcoming time slot
 * Returns null if no upcoming slots today
 */
export function getNextTimeSlot(isShiftedScheduleEnabled: boolean): TimeSlot | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const timeSlots = getTimeSlots(isShiftedScheduleEnabled);

  for (const slot of timeSlots) {
    const slotStartInMinutes = slot.startHour * 60 + slot.startMinute;
    
    if (currentTimeInMinutes < slotStartInMinutes) {
      return slot;
    }
  }

  return null;
}

/**
 * Get the previous time slot
 * Returns null if no previous slots today
 */
export function getPreviousTimeSlot(isShiftedScheduleEnabled: boolean): TimeSlot | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const timeSlots = getTimeSlots(isShiftedScheduleEnabled);
  let previousSlot: TimeSlot | null = null;

  for (const slot of timeSlots) {
    const slotEndInMinutes = slot.endHour * 60 + slot.endMinute;
    
    if (currentTimeInMinutes > slotEndInMinutes) {
      previousSlot = slot;
    } else {
      break;
    }
  }

  return previousSlot;
}
