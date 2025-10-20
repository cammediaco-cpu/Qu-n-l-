import React, { useState, useEffect } from 'react';
import { Schedule, Category } from '../types';
import { translations } from '../constants';

interface ScheduleModalProps {
  schedule: Schedule | null;
  onSave: (data: { time: string; text: string; categoryId?: string }, selectedDays: number[]) => void;
  onClose: () => void;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  isDarkMode: boolean;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, onSave, onClose, categories, setCategories, isDarkMode }) => {
  const [time, setTime] = useState('09:00');
  const [text, setText] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  // States for adding a new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#4f46e5');

  useEffect(() => {
    if (schedule) {
      setTime(schedule.time);
      setText(schedule.text);
      setSelectedDays([schedule.day]);
      setSelectedCategoryId(schedule.categoryId);
    } else {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
      setText('');
      setSelectedDays([]);
      setSelectedCategoryId(undefined);
      setError('');
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  }, [schedule]);

  const [hour, minute] = time.split(':');

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = String(e.target.value).padStart(2, '0');
    setTime(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = String(e.target.value).padStart(2, '0');
    setTime(`${hour}:${newMinute}`);
  };

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };
  
  const handleAddNewCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName) {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        color: newCategoryColor,
      };
      setCategories([...categories, newCategory]);
      setSelectedCategoryId(newCategory.id); // auto-select the new one
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule && selectedDays.length === 0) {
      setError(translations.errorNoDaySelected);
      return;
    }
    if (text.trim()) {
      onSave({ time, text, categoryId: selectedCategoryId }, selectedDays);
    }
  };

  const isEditing = schedule !== null;

  const themeClasses = {
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-white' : 'border-black',
    inputBg: isDarkMode ? 'bg-transparent border-white/50 focus:border-white' : 'bg-transparent border-black/50 focus:border-black',
    option: isDarkMode ? 'bg-black text-white' : 'bg-white text-black',
    button: isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80',
    buttonSecondary: isDarkMode ? 'border border-white hover:bg-white/10' : 'border border-black hover:bg-black/10',
    dayButton: isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20',
    dayButtonActive: isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
  }
  
  const catButtonBase = 'px-3 py-1 text-sm rounded-full transition-all flex items-center gap-2 border-2';
  const catButtonInactive = `border-transparent ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`${themeClasses.bg} ${themeClasses.text} rounded-lg shadow-xl p-6 w-full max-w-lg relative border ${themeClasses.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-2xl font-bold mb-4">
          {isEditing ? translations.editSchedule : translations.addSchedule}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 opacity-70">
              {translations.time}
            </label>
            <div className="flex items-center gap-2">
              <select
                aria-label="Hour"
                value={parseInt(hour, 10).toString()}
                onChange={handleHourChange}
                className={`w-full px-3 py-2 rounded-md border ${themeClasses.inputBg} transition-colors`}
                required
              >
                {Array.from({ length: 24 }, (_, i) => i).map(h => (
                  <option key={h} value={h} className={themeClasses.option}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="font-bold text-lg">:</span>
              <select
                aria-label="Minute"
                value={parseInt(minute, 10).toString()}
                onChange={handleMinuteChange}
                className={`w-full px-3 py-2 rounded-md border ${themeClasses.inputBg} transition-colors`}
                required
              >
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                  <option key={m} value={m} className={themeClasses.option}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="text" className="block text-sm font-medium mb-1 opacity-70">
              {translations.content}
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nội dung công việc..."
              className={`w-full px-3 py-2 rounded-md border ${themeClasses.inputBg} transition-colors`}
              rows={3}
              required
            />
          </div>

          <div className="mb-4">
              <label className="block text-sm font-medium mb-2 opacity-70">{translations.category}</label>
              <div className="flex flex-wrap items-center gap-2">
                   <button
                        type="button"
                        onClick={() => setSelectedCategoryId(undefined)}
                        className={`${catButtonBase} ${selectedCategoryId === undefined ? (isDarkMode ? 'border-white' : 'border-black') : catButtonInactive}`}
                    >
                        {translations.none}
                    </button>
                  {categories.map((cat) => (
                      <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`${catButtonBase} ${selectedCategoryId === cat.id ? '' : catButtonInactive}`}
                          style={{ borderColor: selectedCategoryId === cat.id ? cat.color : 'transparent' }}
                      >
                          <span style={{ backgroundColor: cat.color }} className="w-3 h-3 rounded-full"></span>
                          {cat.name}
                      </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${themeClasses.dayButton}`}
                    title={translations.addCategory}
                  >
                    +
                  </button>
              </div>
          </div>
          
          {isAddingCategory && (
            <div className={`p-3 rounded-md border ${isDarkMode ? 'border-white/20' : 'border-black/20'} mb-4 flex items-center gap-2 animate-fade-in`}>
              <input
                  type="text"
                  placeholder={translations.categoryName}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`flex-grow px-2 py-1 text-sm rounded-md ${themeClasses.inputBg} transition-colors`}
              />
              <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-8 p-0 border-none rounded-md bg-transparent cursor-pointer"
                  title="Chọn màu"
              />
              <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className={`font-bold py-1 px-3 rounded-lg text-sm transition-colors ${themeClasses.button}`}
              >
                  {translations.save}
              </button>
               <style>{`
                @keyframes fade-in {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
              `}</style>
            </div>
          )}


          {!isEditing && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 opacity-70">{translations.days}</label>
              <div className="flex flex-wrap gap-2">
                {translations.weekdays.map((dayName, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDayToggle(index)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedDays.includes(index)
                        ? themeClasses.dayButtonActive
                        : themeClasses.dayButton
                    }`}
                  >
                    {dayName}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}
            >
              {translations.cancel}
            </button>
            <button
              type="submit"
              className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.button}`}
            >
              {translations.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;