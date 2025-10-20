import React from 'react';
import { Schedule, Category } from '../types';
import { translations } from '../constants';

interface TodayTasksProps {
  schedules: Schedule[];
  categories: Category[];
  onToggleComplete: (id: string) => void;
  isDarkMode: boolean;
}

const TodayTasks: React.FC<TodayTasksProps> = ({ schedules, categories, onToggleComplete, isDarkMode }) => {
  const todayIndex = new Date().getDay();
  const todaySchedules = schedules
    .filter(s => s.day === todayIndex && !s.isCompleted)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (schedules.filter(s => s.day === todayIndex).length === 0) {
    return null; // Don't show anything if there are no tasks for today
  }
  
  const checkboxClass = isDarkMode 
    ? "accent-white"
    : "accent-black";
  
  const borderClass = isDarkMode ? 'border-white/30' : 'border-black/30';

  return (
    <section className={`p-4 border ${borderClass} w-72 transition-colors duration-500`}>
      <h2 className="text-md font-semibold mb-2 opacity-80">
        {translations.todayTasksTitle}
      </h2>
      
      {todaySchedules.length > 0 ? (
        <ul className="space-y-1">
          {todaySchedules.map(task => {
            const category = task.categoryId ? categories.find(c => c.id === task.categoryId) : null;
            const textColorStyle = category ? { color: category.color } : {};

            return (
              <li
                key={task.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onChange={() => onToggleComplete(task.id)}
                  className={`h-4 w-4 rounded-sm cursor-pointer border bg-transparent ${checkboxClass} ${isDarkMode ? 'border-white/50' : 'border-black/50'}`}
                  aria-labelledby={`task-label-${task.id}`}
                />
                <label
                  htmlFor={`task-${task.id}`}
                  id={`task-label-${task.id}`}
                  className="flex-grow cursor-pointer"
                >
                  <span className="font-semibold mr-2 opacity-90">{task.time}</span>
                  <span
                    className={category ? 'font-medium' : 'opacity-80'}
                    style={textColorStyle}
                  >
                    {task.text}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
         <p className="text-sm text-center opacity-80 mt-2">
            {translations.allTasksCompleted}
         </p>
      )}
    </section>
  );
};

export default TodayTasks;