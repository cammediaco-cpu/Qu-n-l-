import React from 'react';
import { Schedule } from '../types';
import ScheduleItem from './TaskItem';

interface WeekViewProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ schedules, onEdit, onDelete, isDarkMode }) => {
  const dayHeaders = ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'];
  
  const borderClass = isDarkMode ? 'border-white/30' : 'border-black/30';

  const renderSchedules = (daySchedules: Schedule[]) => {
    if (!daySchedules.length) return null;
    return daySchedules.map(schedule => (
      <ScheduleItem
        key={schedule.id}
        task={schedule}
        onEdit={onEdit}
        onDelete={onDelete}
        isDarkMode={isDarkMode}
      />
    ));
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="grid grid-cols-7 gap-2">
        {dayHeaders.map((dayName) => (
          <div key={dayName} className={`text-center text-xs p-1 border ${borderClass}`}>
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-2 flex-grow min-h-0">
        {dayHeaders.map((_, index) => {
          const jsDayIndex = (index + 1) % 7;
          const morningSchedules = schedules
            .filter(s => s.day === jsDayIndex && s.time <= '13:30')
            .sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={`morning-${index}`} className={`border ${borderClass} p-1 overflow-y-auto`}>
              {renderSchedules(morningSchedules)}
            </div>
          );
        })}
      </div>
      
      <div className="text-center text-xs my-2 opacity-70">NGHỈ TRƯA</div>

      <div className="grid grid-cols-7 gap-2 flex-grow min-h-0">
        {dayHeaders.map((_, index) => {
          const jsDayIndex = (index + 1) % 7;
          const afternoonSchedules = schedules
            .filter(s => s.day === jsDayIndex && s.time > '13:30')
            .sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={`afternoon-${index}`} className={`border ${borderClass} p-1 overflow-y-auto`}>
              {renderSchedules(afternoonSchedules)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;