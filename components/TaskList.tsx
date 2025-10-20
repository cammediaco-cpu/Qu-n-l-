import React from 'react';
import { Schedule, Category } from '../types';
import ScheduleItem from './TaskItem';

interface WeekViewProps {
  schedules: Schedule[];
  categories: Category[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ schedules, categories, onEdit, onDelete, isDarkMode }) => {
  const dayHeaders = ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'];
  
  const borderClass = isDarkMode ? 'border-white/30' : 'border-black/30';

  const renderSchedules = (daySchedules: Schedule[]) => {
    if (!daySchedules.length) return null;
    return daySchedules.map(schedule => (
      <ScheduleItem
        key={schedule.id}
        task={schedule}
        categories={categories}
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
          const daySchedules = schedules
            .filter(s => s.day === jsDayIndex)
            .sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={`day-${index}`} className={`border ${borderClass} p-1 overflow-y-auto`}>
              {renderSchedules(daySchedules)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;