const express = require('express');
const router = express.Router();
const db = require('../db'); // or './db' depending on your folder structure
const { query } = require('../dbPromise');

// Helper function to get random element from array
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Genetic Algorithm Configuration
const GA_CONFIG = {
  POPULATION_SIZE: 100,
  GENERATIONS: 500,
  MUTATION_RATE: 0.1,
  ELITISM_PERCENTAGE: 0.1,
  CROSSOVER_RATE: 0.8,
};

// Constants
const DAYS = 5; // Monday to Friday
const PERIODS = 11; // 8 periods + 3 breaks
const MAX_TEACHER_PERIODS_PER_DAY = 5; // Maximum periods a teacher can teach in a day
const MAX_SUBJECT_PERIODS_PER_DAY = 3; // Maximum periods a subject can be scheduled in a day
const MIN_PERIODS_PER_DAY = 6; // Minimum periods to fill per day

// Helper function to initialize teacher and room schedules
const initializeSchedules = (teachers, rooms) => {
  const teacherSchedule = {};
  const roomSchedule = {};
  
  teachers.forEach(teacher => {
    teacherSchedule[teacher.teacherName] = Array.from({ length: DAYS }, () => 
      Array(PERIODS).fill(false)
    );
  });
  
  rooms.forEach(room => {
    roomSchedule[room.roomNo] = Array.from({ length: DAYS }, () => 
      Array(PERIODS).fill(false)
    );
  });
  
  return { teacherSchedule, roomSchedule };
};

// Individual (Timetable) representation
class Timetable {
  constructor(semester, subjects, teachers, rooms) {
    this.semester = semester;
    this.subjects = subjects;
    this.teachers = teachers;
    this.rooms = rooms;
    this.schedule = Array.from({ length: DAYS }, () => Array(PERIODS).fill(null));
    this.fitness = 0;
    this.teacherSchedule = {};
    this.roomSchedule = {};
    this.subjectScheduleCount = {};
    this.teacherDailyLoad = {};
    this.subjectDailyCount = {};
    
    this.initializeTrackingStructures();
  }
  
  initializeTrackingStructures() {
    const { teacherSchedule, roomSchedule } = initializeSchedules(this.teachers, this.rooms);
    this.teacherSchedule = teacherSchedule;
    this.roomSchedule = roomSchedule;
    
    this.subjects.forEach(subject => {
      this.subjectScheduleCount[subject.subjectName] = 0;
    });
    
    this.teachers.forEach(teacher => {
      this.teacherDailyLoad[teacher.teacherName] = Array(DAYS).fill(0);
    });
    
    this.subjects.forEach(subject => {
      this.subjectDailyCount[subject.subjectName] = Array(DAYS).fill(0);
    });
  }
  
  findTeacher(subject) {
    return this.teachers.find(t => {
      const preferences = JSON.parse(t.preferences || '[]');
      return preferences.includes(subject.id);
    });
  }
  
  findRoomsByType(roomType) {
    return this.rooms.filter(r => r.roomType === roomType);
  }
  
  isSlotAvailable(teacher, room, day, period) {
    return (
      !this.teacherSchedule[teacher.teacherName][day][period] &&
      !this.roomSchedule[room.roomNo][day][period]
    );
  }
  
  scheduleSlot(subject, teacher, room, day, period) {
    const slotData = {
      subject: subject.subjectName + (subject.subjectType === 'Lab' ? ' (Lab)' : ''),
      teacher: teacher.teacherName,
      room: room.roomNo
    };
    
    this.schedule[day][period] = slotData;
    this.teacherSchedule[teacher.teacherName][day][period] = true;
    this.roomSchedule[room.roomNo][day][period] = true;
    this.subjectScheduleCount[subject.subjectName]++;
    this.teacherDailyLoad[teacher.teacherName][day]++;
    this.subjectDailyCount[subject.subjectName][day]++;
    
    return slotData;
  }
  
  randomInitialize() {
    // First, schedule all labs
    const labs = this.subjects.filter(s => s.subjectType === 'Lab');
    this.scheduleLabs(labs);
    
    // Then, schedule all theory subjects
    const theories = this.subjects.filter(s => s.subjectType === 'Theory');
    this.scheduleTheories(theories);
    
    // Schedule any unassigned subjects
    this.scheduleUnassignedSubjects();
    
    // Fill any remaining empty slots
    this.fillEmptySlots();
    
    // Final pass to ensure all slots are filled
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        // Skip break periods (periods 2, 5, and 8)
        if (period === 2 || period === 5 || period === 8) {
          // Mark break periods with a special value
          this.schedule[day][period] = {
            subject: "BREAK",
            teacher: "Break",
            room: "Break"
          };
          continue;
        }
        
        if (!this.schedule[day][period]) {
          // Find a subject that can be scheduled here
          const subject = this.findSubjectForEmptySlot(day, period);
          if (subject) {
            this.fillEmptySlotWithSubject(day, period, subject);
          } else {
            // If no subject found, use a random subject
            const randomSubject = getRandomElement(this.subjects);
            this.fillEmptySlotWithSubject(day, period, randomSubject);
          }
        }
      }
    }
  }
  
  scheduleLabs(labs) {
    for (const lab of labs) {
      const teacher = this.findTeacher(lab);
      const labRooms = this.findRoomsByType('Lab');
      
      if (!teacher || labRooms.length === 0) continue;
      
      let scheduled = 0;
      const maxAttempts = 100;
      let attempts = 0;
      
      while (scheduled < lab.periodsPerWeek && attempts < maxAttempts) {
        attempts++;
        
        const day = Math.floor(Math.random() * DAYS);
        const period = Math.floor(Math.random() * (PERIODS - 1)); // Need consecutive periods
        
        const room = getRandomElement(labRooms);
        
        if (
          this.isSlotAvailable(teacher, room, day, period) &&
          this.isSlotAvailable(teacher, room, day, period + 1) &&
          this.teacherDailyLoad[teacher.teacherName][day] + 2 <= MAX_TEACHER_PERIODS_PER_DAY &&
          !this.hasLabOnDay(day)
        ) {
          this.scheduleSlot(lab, teacher, room, day, period);
          this.scheduleSlot(lab, teacher, room, day, period + 1);
          scheduled += 2;
        }
      }
    }
  }
  
  hasLabOnDay(day) {
    for (let period = 0; period < PERIODS; period++) {
      const slot = this.schedule[day][period];
      if (slot && slot.subject && slot.subject.includes('Lab')) {
        return true;
      }
    }
    return false;
  }
  
  scheduleTheories(theories) {
    for (const theory of theories) {
      const teacher = this.findTeacher(theory);
      const theoryRooms = this.findRoomsByType('Theory');
      
      if (!teacher || theoryRooms.length === 0) continue;
      
      let scheduled = 0;
      const maxAttempts = 200;
      let attempts = 0;
      
      while (scheduled < theory.periodsPerWeek && attempts < maxAttempts) {
        attempts++;
        
        const day = Math.floor(Math.random() * DAYS);
        const period = Math.floor(Math.random() * PERIODS);
        const room = getRandomElement(theoryRooms);
        
        if (
          this.isSlotAvailable(teacher, room, day, period) &&
          this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
          this.subjectDailyCount[theory.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
          !this.hasBackToBackSubject(day, period, theory.subjectName)
        ) {
          this.scheduleSlot(theory, teacher, room, day, period);
          scheduled++;
        }
      }
    }
  }
  
  hasBackToBackSubject(day, period, subjectName) {
    if (period > 0) {
      const prevSlot = this.schedule[day][period - 1];
      if (prevSlot && prevSlot.subject && 
          prevSlot.subject.replace(' (Lab)', '') === subjectName) {
        return true;
      }
    }
    
    if (period < PERIODS - 1) {
      const nextSlot = this.schedule[day][period + 1];
      if (nextSlot && nextSlot.subject && 
          nextSlot.subject.replace(' (Lab)', '') === subjectName) {
        return true;
      }
    }
    
    return false;
  }
  
  scheduleUnassignedSubjects() {
    const unassignedSubjects = this.subjects.filter(subject => {
      return !this.teachers.some(teacher => {
        const preferences = JSON.parse(teacher.preferences || '[]');
        return preferences.includes(subject.id);
      });
    });
    
    for (const subject of unassignedSubjects) {
      const rooms = this.findRoomsByType(subject.subjectType === 'Lab' ? 'Lab' : 'Theory');
      if (rooms.length === 0) continue;
      
      let scheduled = 0;
      const maxAttempts = 100;
      let attempts = 0;
      
      while (scheduled < subject.periodsPerWeek && attempts < maxAttempts) {
        attempts++;
        
        const day = Math.floor(Math.random() * DAYS);
        const period = Math.floor(Math.random() * PERIODS);
        const room = getRandomElement(rooms);
        
        if (subject.subjectType === 'Lab') {
          if (period < PERIODS - 1) {
            if (
              !this.roomSchedule[room.roomNo][day][period] &&
              !this.roomSchedule[room.roomNo][day][period + 1] &&
              !this.hasLabOnDay(day)
            ) {
              this.schedule[day][period] = {
                subject: `${subject.subjectName} (Lab) (No Teacher)`,
                teacher: 'Not Assigned',
                room: room.roomNo
              };
              
              this.schedule[day][period + 1] = {
                subject: `${subject.subjectName} (Lab) (No Teacher)`,
                teacher: 'Not Assigned',
                room: room.roomNo
              };
              
              this.roomSchedule[room.roomNo][day][period] = true;
              this.roomSchedule[room.roomNo][day][period + 1] = true;
              this.subjectScheduleCount[subject.subjectName] += 2;
              scheduled += 2;
            }
          }
        } else {
          if (
            !this.roomSchedule[room.roomNo][day][period] &&
            this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
            !this.hasBackToBackSubject(day, period, subject.subjectName)
          ) {
            this.schedule[day][period] = {
              subject: `${subject.subjectName} (No Teacher)`,
              teacher: 'Not Assigned',
              room: room.roomNo
            };
            
            this.roomSchedule[room.roomNo][day][period] = true;
            this.subjectScheduleCount[subject.subjectName]++;
            this.subjectDailyCount[subject.subjectName][day]++;
            scheduled++;
          }
        }
      }
    }
  }

  countScheduledPeriods(subject) {
    let count = 0;
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        const slot = this.schedule[day][period];
        if (slot && slot.subject && slot.subject.includes(subject.subjectName)) {
          count++;
        }
      }
    }
    return count;
  }

  fillEmptySlots() {
    // First pass: try to schedule additional periods for existing subjects
    for (const subject of this.subjects) {
      const scheduledPeriods = this.countScheduledPeriods(subject);
      const remainingPeriods = subject.periodsPerWeek - scheduledPeriods;
      
      if (remainingPeriods > 0) {
        this.scheduleAdditionalPeriods(subject, remainingPeriods);
      }
    }
    
    // Second pass: fill any remaining empty slots
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        // Skip break periods (periods 2, 5, and 8)
        if (period === 2 || period === 5 || period === 8) {
          // Mark break periods with a special value
          this.schedule[day][period] = {
            subject: "BREAK",
            teacher: "Break",
            room: "Break"
          };
          continue;
        }
        
        if (!this.schedule[day][period]) {
          // Try to find a subject that needs more periods
          const subject = this.findSubjectForEmptySlot(day, period);
          if (subject) {
            this.fillEmptySlotWithSubject(day, period, subject);
          } else {
            // If no suitable subject found, use a random subject
            const randomSubject = getRandomElement(this.subjects);
            this.fillEmptySlotWithSubject(day, period, randomSubject);
          }
        }
      }
    }
    
    // Final pass: force fill any remaining empty slots
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        // Skip break periods
        if (period === 2 || period === 5 || period === 8) {
          continue;
        }
        
        if (!this.schedule[day][period]) {
          // Force fill with a random subject
          const randomSubject = getRandomElement(this.subjects);
          const teacher = this.findTeacher(randomSubject);
          const room = this.findRoomsByType(randomSubject.subjectType === 'Lab' ? 'Lab' : 'Theory')[0];
          
          if (teacher && room) {
            this.schedule[day][period] = {
              subject: randomSubject.subjectName + (randomSubject.subjectType === 'Lab' ? ' (Lab)' : ''),
              teacher: teacher.teacherName,
              room: room.roomNo
            };
            
            // Update tracking structures
            this.teacherSchedule[teacher.teacherName][day][period] = true;
            this.roomSchedule[room.roomNo][day][period] = true;
            this.subjectScheduleCount[randomSubject.subjectName] = (this.subjectScheduleCount[randomSubject.subjectName] || 0) + 1;
            this.teacherDailyLoad[teacher.teacherName][day] = (this.teacherDailyLoad[teacher.teacherName][day] || 0) + 1;
            this.subjectDailyCount[randomSubject.subjectName][day] = (this.subjectDailyCount[randomSubject.subjectName][day] || 0) + 1;
          } else {
            // If no teacher or room available, use any available room
            const anyRoom = this.rooms[0];
            this.schedule[day][period] = {
              subject: randomSubject.subjectName + (randomSubject.subjectType === 'Lab' ? ' (Lab)' : ''),
              teacher: "Not Assigned",
              room: anyRoom.roomNo
            };
            
            // Update tracking structures
            this.roomSchedule[anyRoom.roomNo][day][period] = true;
            this.subjectScheduleCount[randomSubject.subjectName] = (this.subjectScheduleCount[randomSubject.subjectName] || 0) + 1;
            this.subjectDailyCount[randomSubject.subjectName][day] = (this.subjectDailyCount[randomSubject.subjectName][day] || 0) + 1;
          }
        }
      }
    }
  }

  scheduleAdditionalPeriods(subject, count) {
    let scheduled = 0;
    const maxAttempts = 100;
    let attempts = 0;
    
    while (scheduled < count && attempts < maxAttempts) {
      attempts++;
      
      const day = Math.floor(Math.random() * DAYS);
      const period = Math.floor(Math.random() * PERIODS);
      
      if (!this.schedule[day][period]) {
        if (subject.subjectType === 'Lab') {
          if (period < PERIODS - 1 && !this.schedule[day][period + 1]) {
            const teacher = this.findTeacher(subject);
            const rooms = this.findRoomsByType('Lab');
            
            if (teacher && rooms.length > 0) {
              const room = getRandomElement(rooms);
              if (this.isSlotAvailable(teacher, room, day, period) &&
                  this.isSlotAvailable(teacher, room, day, period + 1) &&
                  this.teacherDailyLoad[teacher.teacherName][day] + 2 <= MAX_TEACHER_PERIODS_PER_DAY &&
                  !this.hasLabOnDay(day)) {
                this.scheduleSlot(subject, teacher, room, day, period);
                this.scheduleSlot(subject, teacher, room, day, period + 1);
                scheduled += 2;
              }
            } else if (rooms.length > 0) {
              const room = getRandomElement(rooms);
              if (!this.roomSchedule[room.roomNo][day][period] &&
                  !this.roomSchedule[room.roomNo][day][period + 1] &&
                  !this.hasLabOnDay(day)) {
                this.schedule[day][period] = {
                  subject: `${subject.subjectName} (Lab) (No Teacher)`,
                  teacher: 'Not Assigned',
                  room: room.roomNo
                };
                this.schedule[day][period + 1] = {
                  subject: `${subject.subjectName} (Lab) (No Teacher)`,
                  teacher: 'Not Assigned',
                  room: room.roomNo
                };
                this.roomSchedule[room.roomNo][day][period] = true;
                this.roomSchedule[room.roomNo][day][period + 1] = true;
                this.subjectScheduleCount[subject.subjectName] += 2;
                scheduled += 2;
              }
            }
          }
        } else {
          const teacher = this.findTeacher(subject);
          const rooms = this.findRoomsByType('Theory');
          
          if (teacher && rooms.length > 0) {
            const room = getRandomElement(rooms);
            if (this.isSlotAvailable(teacher, room, day, period) &&
                this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
                this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
                !this.hasBackToBackSubject(day, period, subject.subjectName)) {
              this.scheduleSlot(subject, teacher, room, day, period);
              scheduled++;
            }
          } else if (rooms.length > 0) {
            const room = getRandomElement(rooms);
            if (!this.roomSchedule[room.roomNo][day][period] &&
                this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
                !this.hasBackToBackSubject(day, period, subject.subjectName)) {
              this.schedule[day][period] = {
                subject: `${subject.subjectName} (No Teacher)`,
                teacher: 'Not Assigned',
                room: room.roomNo
              };
              this.roomSchedule[room.roomNo][day][period] = true;
              this.subjectScheduleCount[subject.subjectName]++;
              this.subjectDailyCount[subject.subjectName][day]++;
              scheduled++;
            }
          }
        }
      }
    }
  }

  fillEmptySlot(day, period) {
    // Try to find a subject that needs more periods
    for (const subject of this.subjects) {
      const scheduledCount = this.subjectScheduleCount[subject.subjectName] || 0;
      if (scheduledCount < subject.periodsPerWeek) {
        if (this.fillEmptySlotWithSubject(day, period, subject)) {
          return true;
        }
      }
    }
    
    // If no subject needs more periods, just pick any subject
    const subject = getRandomElement(this.subjects);
    return this.fillEmptySlotWithSubject(day, period, subject);
  }

  fillEmptySlotWithSubject(day, period, subject) {
    // Try with assigned teacher first
    if (subject.subjectType === 'Lab') {
      if (period < PERIODS - 1 && !this.schedule[day][period + 1]) {
        const teacher = this.findTeacher(subject);
        const labRooms = this.findRoomsByType('Lab');
        
        if (teacher && labRooms.length > 0) {
          const room = getRandomElement(labRooms);
          if (this.isSlotAvailable(teacher, room, day, period) &&
              this.isSlotAvailable(teacher, room, day, period + 1) &&
              this.teacherDailyLoad[teacher.teacherName][day] + 2 <= MAX_TEACHER_PERIODS_PER_DAY &&
              !this.hasLabOnDay(day)) {
            this.scheduleSlot(subject, teacher, room, day, period);
            this.scheduleSlot(subject, teacher, room, day, period + 1);
            return true;
          }
        }
        
        // If can't schedule with teacher, try without teacher
        if (labRooms.length > 0) {
          const room = getRandomElement(labRooms);
          if (!this.roomSchedule[room.roomNo][day][period] &&
              !this.roomSchedule[room.roomNo][day][period + 1] &&
              !this.hasLabOnDay(day)) {
            this.schedule[day][period] = {
              subject: `${subject.subjectName} (Lab) (No Teacher)`,
              teacher: 'Not Assigned',
              room: room.roomNo
            };
            
            this.schedule[day][period + 1] = {
              subject: `${subject.subjectName} (Lab) (No Teacher)`,
              teacher: 'Not Assigned',
              room: room.roomNo
            };
            
            this.roomSchedule[room.roomNo][day][period] = true;
            this.roomSchedule[room.roomNo][day][period + 1] = true;
            this.subjectScheduleCount[subject.subjectName] += 2;
            return true;
          }
        }
      }
    } else {
      // For theory subjects
      const teacher = this.findTeacher(subject);
      const theoryRooms = this.findRoomsByType('Theory');
      
      if (teacher && theoryRooms.length > 0) {
        const room = getRandomElement(theoryRooms);
        if (this.isSlotAvailable(teacher, room, day, period) &&
            this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
            this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
            !this.hasBackToBackSubject(day, period, subject.subjectName)) {
          this.scheduleSlot(subject, teacher, room, day, period);
          return true;
        }
      }
      
      // If can't schedule with teacher, try without teacher
      if (theoryRooms.length > 0) {
        const room = getRandomElement(theoryRooms);
        if (!this.roomSchedule[room.roomNo][day][period] &&
            this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
            !this.hasBackToBackSubject(day, period, subject.subjectName)) {
          this.schedule[day][period] = {
            subject: `${subject.subjectName} (No Teacher)`,
            teacher: 'Not Assigned',
            room: room.roomNo
          };
          
          this.roomSchedule[room.roomNo][day][period] = true;
          this.subjectScheduleCount[subject.subjectName]++;
          this.subjectDailyCount[subject.subjectName][day]++;
          return true;
        }
      }
    }
    
    // If all else fails, force schedule the subject
    // This is a fallback to ensure no empty slots
    const roomType = subject.subjectType === 'Lab' ? 'Lab' : 'Theory';
    const rooms = this.findRoomsByType(roomType);
    
    if (rooms.length > 0) {
      const room = getRandomElement(rooms);
      
      // Force schedule even if there are conflicts
      this.schedule[day][period] = {
        subject: `${subject.subjectName}${subject.subjectType === 'Lab' ? ' (Lab)' : ''} (Forced)`,
        teacher: 'Not Assigned',
        room: room.roomNo
      };
      
      this.roomSchedule[room.roomNo][day][period] = true;
      this.subjectScheduleCount[subject.subjectName]++;
      this.subjectDailyCount[subject.subjectName][day]++;
      return true;
    }
    
    // If no rooms available, use any room
    const anyRoom = getRandomElement(this.rooms);
    this.schedule[day][period] = {
      subject: `${subject.subjectName} (Emergency)`,
      teacher: 'Not Assigned',
      room: anyRoom.roomNo
    };
    
    this.roomSchedule[anyRoom.roomNo][day][period] = true;
    this.subjectScheduleCount[subject.subjectName]++;
    this.subjectDailyCount[subject.subjectName][day]++;
    return true;
  }

  findSubjectForEmptySlot(day, period) {
    // First try subjects that haven't reached their required periods
    const incompleteSubjects = this.subjects.filter(subject => !this.hasReachedRequiredPeriods(subject));
    
    if (incompleteSubjects.length > 0) {
      // Sort by how many more periods they need (descending)
      incompleteSubjects.sort((a, b) => {
        const aRemaining = a.periodsPerWeek - (this.subjectScheduleCount[a.subjectName] || 0);
        const bRemaining = b.periodsPerWeek - (this.subjectScheduleCount[b.subjectName] || 0);
        return bRemaining - aRemaining;
      });
      
      // Try each incomplete subject
      for (const subject of incompleteSubjects) {
        if (subject.subjectType === 'Lab') {
          if (period < PERIODS - 1 && !this.schedule[day][period + 1]) {
            return subject;
          }
        } else {
          // For theory subjects, check if it can be scheduled here
          const teacher = this.findTeacher(subject);
          const rooms = this.findRoomsByType('Theory');
          
          if (teacher && rooms.length > 0) {
            const room = getRandomElement(rooms);
            if (this.isSlotAvailable(teacher, room, day, period) &&
                this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
                this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
                !this.hasBackToBackSubject(day, period, subject.subjectName)) {
              return subject;
            }
          } else if (rooms.length > 0) {
            const room = getRandomElement(rooms);
            if (!this.roomSchedule[room.roomNo][day][period] &&
                this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
                !this.hasBackToBackSubject(day, period, subject.subjectName)) {
              return subject;
            }
          }
        }
      }
    }
    
    // If no incomplete subjects can be scheduled, try any subject that can fit
    const shuffledSubjects = [...this.subjects].sort(() => 0.5 - Math.random());
    for (const subject of shuffledSubjects) {
      if (subject.subjectType === 'Lab') {
        if (period < PERIODS - 1 && !this.schedule[day][period + 1]) {
          return subject;
        }
      } else {
        // For theory subjects, check if it can be scheduled here
        const teacher = this.findTeacher(subject);
        const rooms = this.findRoomsByType('Theory');
        
        if (teacher && rooms.length > 0) {
          const room = getRandomElement(rooms);
          if (this.isSlotAvailable(teacher, room, day, period) &&
              this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
              this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
              !this.hasBackToBackSubject(day, period, subject.subjectName)) {
            return subject;
          }
        } else if (rooms.length > 0) {
          const room = getRandomElement(rooms);
          if (!this.roomSchedule[room.roomNo][day][period] &&
              this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
              !this.hasBackToBackSubject(day, period, subject.subjectName)) {
            return subject;
          }
        }
      }
    }
    
    // If no suitable subject found, return any theory subject
    return this.subjects.find(s => s.subjectType === 'Theory') || this.subjects[0];
  }

  calculateFitness() {
    let fitness = 1000; // Start with a base fitness
    
    // 1. Check if each subject meets its periodsPerWeek requirement (highest priority)
    for (const subject of this.subjects) {
      const scheduledCount = this.subjectScheduleCount[subject.subjectName] || 0;
      const requiredCount = subject.periodsPerWeek;
      
      if (scheduledCount !== requiredCount) {
        // Heavily penalize if not meeting the required periods
        fitness -= Math.abs(scheduledCount - requiredCount) * 1000;
      }
    }
    
    // 2. Empty slots (very high penalty)
    const emptySlots = this.countEmptySlots();
    fitness -= emptySlots * 200;
    
    // 3. Teacher conflicts (most severe penalty)
    const teacherConflicts = this.countTeacherConflicts();
    fitness -= teacherConflicts * 50;
    
    // 4. Room conflicts
    const roomConflicts = this.countRoomConflicts();
    fitness -= roomConflicts * 50;
    
    // 5. Back-to-back same subject (high penalty)
    const backToBackConflicts = this.countBackToBackSubjectConflicts();
    fitness -= backToBackConflicts * 40;
    
    // 6. Multiple labs per day (high penalty)
    const multipleLabsPerDay = this.countMultipleLabsPerDay();
    fitness -= multipleLabsPerDay * 60;
    
    // 7. Teacher daily overload (high penalty)
    const teacherOverloads = this.countTeacherOverloads();
    fitness -= teacherOverloads * 30;
    
    // 8. Subject distribution issues (medium penalty)
    const subjectDistributionIssues = this.countSubjectDistributionIssues();
    fitness -= subjectDistributionIssues * 20;
    
    this.fitness = Math.max(0, fitness);
    return this.fitness;
  }
  
  countEmptySlots() {
    let count = 0;
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        if (!this.schedule[day][period]) {
          count++;
        }
      }
    }
    return count;
  }

  countTeacherConflicts() {
    let conflicts = 0;
    
    for (const teacher of this.teachers) {
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS; period++) {
          if (this.teacherSchedule[teacher.teacherName][day][period]) {
            let count = 0;
            for (let d = 0; d < DAYS; d++) {
              for (let p = 0; p < PERIODS; p++) {
                const slot = this.schedule[d][p];
                if (slot && slot.teacher === teacher.teacherName && 
                    d === day && p === period) {
                  count++;
                }
              }
            }
            if (count > 1) conflicts++;
          }
        }
      }
    }
    
    return conflicts;
  }
  
  countRoomConflicts() {
    let conflicts = 0;
    
    for (const room of this.rooms) {
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS; period++) {
          if (this.roomSchedule[room.roomNo][day][period]) {
            let count = 0;
            for (let d = 0; d < DAYS; d++) {
              for (let p = 0; p < PERIODS; p++) {
                const slot = this.schedule[d][p];
                if (slot && slot.room === room.roomNo && 
                    d === day && p === period) {
                  count++;
                }
              }
            }
            if (count > 1) conflicts++;
          }
        }
      }
    }
    
    return conflicts;
  }
  
  countBackToBackSubjectConflicts() {
    let conflicts = 0;
    
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS - 1; period++) {
        const currentSlot = this.schedule[day][period];
        const nextSlot = this.schedule[day][period + 1];
        
        if (currentSlot && nextSlot && currentSlot.subject && nextSlot.subject) {
          const currentSubject = currentSlot.subject.replace(' (Lab)', '');
          const nextSubject = nextSlot.subject.replace(' (Lab)', '');
          
          if (currentSubject === nextSubject && !currentSlot.subject.includes('Lab')) {
            conflicts++;
          }
        }
      }
    }
    
    return conflicts;
  }
  
  countMultipleLabsPerDay() {
    let violations = 0;
    
    for (let day = 0; day < DAYS; day++) {
      let labCount = 0;
      let currentLab = null;
      
      for (let period = 0; period < PERIODS; period++) {
        const slot = this.schedule[day][period];
        if (slot && slot.subject && slot.subject.includes('Lab')) {
          const labName = slot.subject.replace(' (Lab)', '');
          if (currentLab === null || currentLab === labName) {
            currentLab = labName;
            labCount++;
          } else {
            violations++;
          }
        }
      }
      
      if (labCount > 2) {
        violations++;
      }
    }
    
    return violations;
  }
  
  countTeacherOverloads() {
    let overloads = 0;
    
    for (const teacher of this.teachers) {
      for (let day = 0; day < DAYS; day++) {
        if (this.teacherDailyLoad[teacher.teacherName][day] > MAX_TEACHER_PERIODS_PER_DAY) {
          overloads++;
        }
      }
    }
    
    return overloads;
  }
  
  countSubjectDistributionIssues() {
    let issues = 0;
    
    for (const subject of this.subjects) {
      for (let day = 0; day < DAYS; day++) {
        if (this.subjectDailyCount[subject.subjectName][day] > MAX_SUBJECT_PERIODS_PER_DAY) {
          issues++;
        }
      }
    }
    
    return issues;
  }
  
  // Add new helper method to check if a subject has reached its required periods
  hasReachedRequiredPeriods(subject) {
    const scheduledCount = this.subjectScheduleCount[subject.subjectName] || 0;
    return scheduledCount >= subject.periodsPerWeek;
  }

  crossover(partner) {
    const child = new Timetable(this.semester, this.subjects, this.teachers, this.rooms);
    
    for (let day = 0; day < DAYS; day++) {
      const takeFromParent = Math.random() < 0.5 ? this : partner;
      child.schedule[day] = [...takeFromParent.schedule[day]];
    }
    
    child.initializeTrackingStructures();
    
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        const slot = child.schedule[day][period];
        if (slot) {
          const subject = this.subjects.find(s => 
            s.subjectName === slot.subject.replace(' (Lab)', '').replace(' (No Teacher)', '')
          );
          const teacher = this.teachers.find(t => t.teacherName === slot.teacher);
          const room = this.rooms.find(r => r.roomNo === slot.room);
          
          if (subject && room) {
            child.roomSchedule[room.roomNo][day][period] = true;
            child.subjectScheduleCount[subject.subjectName]++;
            child.subjectDailyCount[subject.subjectName][day]++;
            
            if (teacher && slot.teacher !== 'Not Assigned') {
              child.teacherSchedule[teacher.teacherName][day][period] = true;
              child.teacherDailyLoad[teacher.teacherName][day]++;
            }
          }
        }
      }
    }
    
    return child;
  }
  
  mutate() {
    const day = Math.floor(Math.random() * DAYS);
    const period = Math.floor(Math.random() * PERIODS);
    const slot = this.schedule[day][period];
    
    if (!slot) return;
    
    const subject = this.subjects.find(s => 
      s.subjectName === slot.subject.replace(' (Lab)', '').replace(' (No Teacher)', '')
    );
    if (!subject) return;
    
    this.clearSlot(day, period, slot);
    
    if (subject.subjectType === 'Lab') {
      this.rescheduleLab(subject, day, period);
    } else {
      this.rescheduleTheory(subject, day, period);
    }
  }
  
  clearSlot(day, period, slot) {
    const subjectName = slot.subject.replace(' (Lab)', '').replace(' (No Teacher)', '');
    const subject = this.subjects.find(s => s.subjectName === subjectName);
    const teacher = this.teachers.find(t => t.teacherName === slot.teacher);
    const room = this.rooms.find(r => r.roomNo === slot.room);
    
    if (subject) {
      this.subjectScheduleCount[subjectName]--;
      this.subjectDailyCount[subjectName][day]--;
    }
    
    if (room) {
      this.roomSchedule[room.roomNo][day][period] = false;
    }
    
    if (teacher && slot.teacher !== 'Not Assigned') {
      this.teacherSchedule[teacher.teacherName][day][period] = false;
      this.teacherDailyLoad[teacher.teacherName][day]--;
    }
    
    this.schedule[day][period] = null;
    
    if (slot.subject.includes('Lab') && period < PERIODS - 1) {
      const nextSlot = this.schedule[day][period + 1];
      if (nextSlot && nextSlot.subject === slot.subject) {
        this.clearSlot(day, period + 1, nextSlot);
      }
    }
  }
  
  rescheduleLab(subject, oldDay, oldPeriod) {
    const teacher = this.findTeacher(subject);
    const labRooms = this.findRoomsByType('Lab');
    
    if (!teacher || labRooms.length === 0) {
      this.scheduleUnassignedLab(subject);
      return;
    }
    
    let scheduled = false;
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!scheduled && attempts < maxAttempts) {
      attempts++;
      
      const day = Math.floor(Math.random() * DAYS);
      const period = Math.floor(Math.random() * (PERIODS - 1));
      
      const room = getRandomElement(labRooms);
      
      if (
        this.isSlotAvailable(teacher, room, day, period) &&
        this.isSlotAvailable(teacher, room, day, period + 1) &&
        this.teacherDailyLoad[teacher.teacherName][day] + 2 <= MAX_TEACHER_PERIODS_PER_DAY &&
        !this.hasLabOnDay(day)
      ) {
        this.scheduleSlot(subject, teacher, room, day, period);
        this.scheduleSlot(subject, teacher, room, day, period + 1);
        scheduled = true;
      }
    }
    
    if (!scheduled) {
      this.scheduleUnassignedLab(subject);
    }
  }
  
  scheduleUnassignedLab(subject) {
    const labRooms = this.findRoomsByType('Lab');
    if (labRooms.length === 0) return;
    
    let scheduled = false;
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!scheduled && attempts < maxAttempts) {
      attempts++;
      
      const day = Math.floor(Math.random() * DAYS);
      const period = Math.floor(Math.random() * (PERIODS - 1));
      
      const room = getRandomElement(labRooms);
      
      if (
        !this.roomSchedule[room.roomNo][day][period] &&
        !this.roomSchedule[room.roomNo][day][period + 1] &&
        !this.hasLabOnDay(day)
      ) {
        this.schedule[day][period] = {
          subject: `${subject.subjectName} (Lab) (No Teacher)`,
          teacher: 'Not Assigned',
          room: room.roomNo
        };
        
        this.schedule[day][period + 1] = {
          subject: `${subject.subjectName} (Lab) (No Teacher)`,
          teacher: 'Not Assigned',
          room: room.roomNo
        };
        
        this.roomSchedule[room.roomNo][day][period] = true;
        this.roomSchedule[room.roomNo][day][period + 1] = true;
        this.subjectScheduleCount[subject.subjectName] += 2;
        scheduled = true;
      }
    }
  }
  
  rescheduleTheory(subject, oldDay, oldPeriod) {
    const teacher = this.findTeacher(subject);
    const theoryRooms = this.findRoomsByType('Theory');
    
    if (!teacher || theoryRooms.length === 0) {
      this.scheduleUnassignedTheory(subject);
      return;
    }
    
    let scheduled = false;
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!scheduled && attempts < maxAttempts) {
      attempts++;
      
      const day = Math.floor(Math.random() * DAYS);
      const period = Math.floor(Math.random() * PERIODS);
      const room = getRandomElement(theoryRooms);
      
      if (
        this.isSlotAvailable(teacher, room, day, period) &&
        this.teacherDailyLoad[teacher.teacherName][day] < MAX_TEACHER_PERIODS_PER_DAY &&
        this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
        !this.hasBackToBackSubject(day, period, subject.subjectName)
      ) {
        this.scheduleSlot(subject, teacher, room, day, period);
        scheduled = true;
      }
    }
    
    if (!scheduled) {
      this.scheduleUnassignedTheory(subject);
    }
  }
  
  scheduleUnassignedTheory(subject) {
    const theoryRooms = this.findRoomsByType('Theory');
    if (theoryRooms.length === 0) return;
    
    let scheduled = false;
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!scheduled && attempts < maxAttempts) {
      attempts++;
      
      const day = Math.floor(Math.random() * DAYS);
      const period = Math.floor(Math.random() * PERIODS);
      const room = getRandomElement(theoryRooms);
      
      if (
        !this.roomSchedule[room.roomNo][day][period] &&
        this.subjectDailyCount[subject.subjectName][day] < MAX_SUBJECT_PERIODS_PER_DAY &&
        !this.hasBackToBackSubject(day, period, subject.subjectName)
      ) {
        this.schedule[day][period] = {
          subject: `${subject.subjectName} (No Teacher)`,
          teacher: 'Not Assigned',
          room: room.roomNo
        };
        
        this.roomSchedule[room.roomNo][day][period] = true;
        this.subjectScheduleCount[subject.subjectName]++;
        this.subjectDailyCount[subject.subjectName][day]++;
        scheduled = true;
      }
    }
  }

  countUnscheduledSubjects() {
    let unscheduled = 0;
    
    for (const subject of this.subjects) {
      const scheduledCount = this.subjectScheduleCount[subject.subjectName] || 0;
      if (scheduledCount < subject.periodsPerWeek) {
        unscheduled += (subject.periodsPerWeek - scheduledCount);
      }
    }
    
    return unscheduled;
  }

  countNonConsecutiveLabs() {
    let violations = 0;
    
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS - 1; period++) {
        const currentSlot = this.schedule[day][period];
        const nextSlot = this.schedule[day][period + 1];
        
        if (currentSlot && currentSlot.subject && currentSlot.subject.includes('Lab')) {
          if (!nextSlot || !nextSlot.subject || 
              nextSlot.subject.replace(' (Lab)', '') !== currentSlot.subject.replace(' (Lab)', '')) {
            violations++;
          }
        }
      }
    }
    
    return violations;
  }

  countUnassignedSubjects() {
    let count = 0;
    
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS; period++) {
        const slot = this.schedule[day][period];
        if (slot && slot.teacher === 'Not Assigned') {
          count++;
        }
      }
    }
    
    return count;
  }
}

// Genetic Algorithm Population
class Population {
  constructor(semester, subjects, teachers, rooms, size) {
    this.individuals = [];
    this.semester = semester;
    this.subjects = subjects;
    this.teachers = teachers;
    this.rooms = rooms;
    
    for (let i = 0; i < size; i++) {
      const individual = new Timetable(semester, subjects, teachers, rooms);
      individual.randomInitialize();
      individual.calculateFitness();
      this.individuals.push(individual);
    }
  }
  
  sort() {
    this.individuals.sort((a, b) => b.fitness - a.fitness);
  }
  
  selectParent() {
    const tournamentSize = 5;
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.individuals.length);
      tournament.push(this.individuals[randomIndex]);
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }
  
  evolve() {
    this.sort();
    const newIndividuals = [];
    const elitismCount = Math.floor(this.individuals.length * GA_CONFIG.ELITISM_PERCENTAGE);
    
    for (let i = 0; i < elitismCount; i++) {
      newIndividuals.push(this.individuals[i]);
    }
    
    while (newIndividuals.length < this.individuals.length) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();
      
      let child;
      if (Math.random() < GA_CONFIG.CROSSOVER_RATE) {
        child = parent1.crossover(parent2);
      } else {
        child = Math.random() < 0.5 ? parent1 : parent2;
      }
      
      if (Math.random() < GA_CONFIG.MUTATION_RATE) {
        child.mutate();
      }
      
      child.calculateFitness();
      newIndividuals.push(child);
    }
    
    this.individuals = newIndividuals;
  }
  
  getBestIndividual() {
    this.sort();
    return this.individuals[0];
  }
}

// Genetic Algorithm for timetable generation
async function generateTimetableWithGA(semester, subjects, teachers, rooms) {
  const population = new Population(semester, subjects, teachers, rooms, GA_CONFIG.POPULATION_SIZE);
  
  let bestFitness = 0;
  let unchangedGenerations = 0;
  const maxUnchangedGenerations = 50;
  let bestIndividual = null;
  
  for (let generation = 0; generation < GA_CONFIG.GENERATIONS; generation++) {
    population.evolve();
    const currentBest = population.getBestIndividual();
    
    if (currentBest.fitness > bestFitness) {
      bestFitness = currentBest.fitness;
      bestIndividual = currentBest;
      unchangedGenerations = 0;
      
      console.log(`Generation ${generation}: New best fitness = ${bestFitness}`);
      console.log(`Unscheduled subjects: ${currentBest.countUnscheduledSubjects()}`);
      console.log(`Teacher conflicts: ${currentBest.countTeacherConflicts()}`);
      console.log(`Room conflicts: ${currentBest.countRoomConflicts()}`);
      console.log(`Empty slots: ${currentBest.countEmptySlots()}`);
    } else {
      unchangedGenerations++;
    }
    
    if (unchangedGenerations >= maxUnchangedGenerations) {
      console.log(`Early stopping at generation ${generation}`);
      break;
    }
  }
  
  return bestIndividual || population.getBestIndividual();
}

// Routes
router.get('/lecturerTimetable', async (req, res) => {
  const department = req.headers.department;
  const teacher = req.headers.teacher;

  if (!department || !teacher) {
    return res.status(400).json({ error: "Department and teacher required" });
  }

  try {
    const timetableData = await query(
      'SELECT timetable FROM generated_timetables WHERE department = ?', [department]
    );

    if (timetableData.length === 0) {
      return res.status(404).json({ error: "Timetable not found" });
    }

    const allSemesters = JSON.parse(timetableData[0].timetable);
    const lecturerTimetable = Array.from({ length: 5 }, () => Array(11).fill(null));

    for (const sem of allSemesters) {
      for (let day = 0; day < 5; day++) {
        for (let period = 0; period < 11; period++) {
          const slot = sem.timetable[day][period];
          if (slot?.teacher === teacher) {
            lecturerTimetable[day][period] = slot;
          }
        }
      }
    }

    res.json({ timetable: lecturerTimetable });
  } catch (err) {
    console.error("Error fetching lecturer timetable:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /getSavedTimetable
router.get("/getSavedTimetable", (req, res) => {
  const department = req.headers.department;

  if (!department) {
    return res.status(400).json({ success: false, message: "Department is required" });
  }

  db.query(
    "SELECT timetable FROM generated_timetables WHERE department = ?",
    [department],
    (err, results) => {
      if (err) {
        console.error("🔥 Error fetching saved timetable:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ success: false, message: "No timetable found" });
      }

      let savedTimetable;
      try {
        savedTimetable = JSON.parse(results[0].timetable);
      } catch (parseError) {
        console.error("🔥 Error parsing timetable JSON:", parseError);
        return res.status(500).json({ success: false, message: "Invalid timetable format in DB" });
      }

      return res.json({ success: true, data: savedTimetable });
    }
  );
});

router.get('/generateTimetable', async (req, res) => {
  const department = req.headers.department;
  if (!department) return res.status(400).json({ error: "Department required" });

  try {
    const semesters = await query('SELECT DISTINCT semester FROM subjects WHERE department = ?', [department]);
    const teachers = await query('SELECT * FROM teachers WHERE department = ?', [department]);
    const rooms = await query('SELECT * FROM classrooms');

    const finalTimetable = [];

    for (const row of semesters) {
      const semester = row.semester;
      const subjects = await query('SELECT * FROM subjects WHERE department = ? AND semester = ?', [department, semester]);
      
      console.log(`Generating timetable for semester ${semester}`);
      
      const bestTimetable = await generateTimetableWithGA(semester, subjects, teachers, rooms);
      
      finalTimetable.push({
        semester,
        department,
        timetable: bestTimetable.schedule,
        fitness: bestTimetable.fitness,
        unscheduledSubjects: bestTimetable.countUnscheduledSubjects(),
        teacherConflicts: bestTimetable.countTeacherConflicts(),
        roomConflicts: bestTimetable.countRoomConflicts(),
        backToBackConflicts: bestTimetable.countBackToBackSubjectConflicts(),
        multipleLabsPerDay: bestTimetable.countMultipleLabsPerDay(),
        emptySlots: bestTimetable.countEmptySlots(),
        nonConsecutiveLabs: bestTimetable.countNonConsecutiveLabs(),
        unassignedSubjects: bestTimetable.countUnassignedSubjects()
      });
    }

    const [existing] = await query('SELECT id FROM generated_timetables WHERE department = ?', [department]);
    if (existing) {
      await query('UPDATE generated_timetables SET timetable = ? WHERE department = ?', [JSON.stringify(finalTimetable), department]);
    } else {
      await query('INSERT INTO generated_timetables (department, timetable) VALUES (?, ?)', [department, JSON.stringify(finalTimetable)]);
    }

    res.json({ 
      message: "Timetable generated and stored", 
      data: finalTimetable,
      stats: finalTimetable.map(t => ({
        semester: t.semester,
        fitness: t.fitness,
        unscheduledSubjects: t.unscheduledSubjects,
        emptySlots: t.emptySlots,
        conflicts: {
          teacher: t.teacherConflicts,
          room: t.roomConflicts,
          backToBack: t.backToBackConflicts,
          multipleLabs: t.multipleLabsPerDay,
          nonConsecutiveLabs: t.nonConsecutiveLabs,
          unassignedSubjects: t.unassignedSubjects
        }
      }))
    });
  } catch (err) {
    console.error("Error generating timetable:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;