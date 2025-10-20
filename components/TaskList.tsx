
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
  
  const borderClass = isDarkMode ? 'border-white/20' : 'border-black/20';

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
    <div className="w-full h-full overflow-auto">
      <div className="min-w-[840px] h-full flex flex-col">
        <div className="grid grid-cols-7">
          {dayHeaders.map((dayName) => (
            <div key={dayName} className="text-center text-xs p-2 font-semibold opacity-80 uppercase sticky top-0 bg-inherit z-10">
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-grow min-h-0 pt-2">
          {dayHeaders.map((_, index) => {
            const jsDayIndex = (index + 1) % 7;
            const daySchedules = schedules
              .filter(s => s.day === jsDayIndex)
              .sort((a, b) => a.time.localeCompare(b.time));
            
            const isLast = index === dayHeaders.length - 1;
              
            return (
              <div key={`day-${index}`} className={`p-1.5 overflow-y-auto ${isLast ? '' : `border-r ${borderClass}`}`}>
                <div className="space-y-1">
                  {renderSchedules(daySchedules)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
