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
    .filter(s => s.day === todayIndex)
    .sort((a, b) => a.time.localeCompare(b.time));

  const uncompletedSchedules = todaySchedules.filter(s => !s.isCompleted);
  const hasTasksToday = todaySchedules.length > 0;
  
  const checkboxClass = isDarkMode 
    ? "accent-white"
    : "accent-black";

  return (
    <section className="w-[450px] flex-shrink-0">
      <h2 className="text-xl font-semibold mb-3 opacity-80">
        {translations.todayTasksTitle}
      </h2>
      
      {!hasTasksToday ? (
        <p className="text-lg opacity-60">{translations.noTasksToday}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-h-[30vh] overflow-y-auto">
            {todaySchedules.map(task => {
              const category = task.categoryId ? categories.find(c => c.id === task.categoryId) : null;
              const textColorStyle = category ? { color: category.color } : {};
              const completedClass = task.isCompleted ? 'line-through opacity-60' : '';

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 text-base"
                >
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    checked={task.isCompleted}
                    onChange={() => onToggleComplete(task.id)}
                    className={`h-5 w-5 rounded-sm cursor-pointer border bg-transparent flex-shrink-0 mt-1 ${checkboxClass} ${isDarkMode ? 'border-white/50' : 'border-black/50'}`}
                    aria-labelledby={`task-label-${task.id}`}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    id={`task-label-${task.id}`}
                    className={`flex-grow cursor-pointer transition-all duration-300 ${completedClass}`}
                  >
                    <span className="font-semibold mr-2 opacity-90">{task.time}</span>
                    <span
                      className={category ? 'font-medium' : 'opacity-80'}
                      style={textColorStyle}
                    >
                      {task.text}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
          {uncompletedSchedules.length === 0 && (
             <p className="text-lg text-center opacity-80 mt-4">
                {translations.allTasksCompleted}
             </p>
          )}
        </>
      )}
    </section>
  );
};

export default TodayTasks;