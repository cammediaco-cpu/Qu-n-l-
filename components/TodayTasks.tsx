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

  const hasTasksToday = schedules.some(s => s.day === todayIndex);

  if (!hasTasksToday) {
    return null; // Don't show anything if there are no tasks for today
  }
  
  const checkboxClass = isDarkMode 
    ? "accent-white"
    : "accent-black";
  
  const sectionClass = isDarkMode 
    ? 'bg-black/40 backdrop-blur-xl border border-white/20' 
    : 'bg-white/50 backdrop-blur-xl border border-black/20';

  return (
    <section className={`p-4 rounded-2xl shadow-lg transition-colors duration-500 ${sectionClass}`}>
      <h2 className="text-sm font-semibold mb-3 opacity-80">
        {translations.todayTasksTitle}
      </h2>
      
      {todaySchedules.length > 0 ? (
        <ul className="space-y-2">
          {todaySchedules.map(task => {
            const category = task.categoryId ? categories.find(c => c.id === task.categoryId) : null;
            const textColorStyle = category ? { color: category.color } : {};

            return (
              <li
                key={task.id}
                className="flex items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onChange={() => onToggleComplete(task.id)}
                  className={`h-4 w-4 rounded-sm cursor-pointer border bg-transparent flex-shrink-0 ${checkboxClass} ${isDarkMode ? 'border-white/50' : 'border-black/50'}`}
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