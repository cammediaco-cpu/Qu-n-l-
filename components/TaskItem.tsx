import React from 'react';
import { Schedule, Category } from '../types';
import { translations } from '../constants';

interface ScheduleItemProps {
  task: Schedule;
  categories: Category[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({ task, categories, onEdit, onDelete, isDarkMode }) => {
  const hoverClass = isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10';
  const deleteColor = isDarkMode ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black';
  
  const category = task.categoryId ? categories.find(c => c.id === task.categoryId) : null;
  const categoryBorderStyle = category ? { borderLeft: `3px solid ${category.color}` } : {};
  const textCategoryStyle = category ? { color: category.color } : {};
  const categoryPadding = category ? 'pl-2' : 'pl-1';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent onEdit from firing
    onDelete(task.id);
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className={`p-1 text-xs rounded-sm cursor-pointer relative group transition-colors ${hoverClass}`}
      style={categoryBorderStyle}
      title={`Sửa: ${task.text}`}
    >
      <div className={`pr-4 ${categoryPadding}`}>
        <span className="font-semibold">{task.time}</span>
        <span
          className={`ml-1 break-words ${category ? 'font-medium' : 'opacity-80'}`}
          style={textCategoryStyle}
        >
          {task.text}
        </span>
      </div>
      <button
        onClick={handleDelete}
        className={`absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity ${deleteColor}`}
        aria-label={`${translations.delete} ${task.text}`}
        title={translations.delete}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ScheduleItem;
