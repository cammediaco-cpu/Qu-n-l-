import React, { useState, useEffect } from 'react';
import { Schedule } from '../types';
import { translations } from '../constants';

interface ScheduleModalProps {
  schedule: Schedule | null;
  onSave: (data: { time: string; text: string; }, selectedDays: number[]) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, onSave, onClose, isDarkMode }) => {
  const [time, setTime] = useState('09:00');
  const [text, setText] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (schedule) {
      setTime(schedule.time);
      setText(schedule.text);
      setSelectedDays([schedule.day]);
    } else {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
      setText('');
      setSelectedDays([]);
      setError('');
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule && selectedDays.length === 0) {
      setError(translations.errorNoDaySelected);
      return;
    }
    if (text.trim()) {
      onSave({ time, text }, selectedDays);
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
              rows={4}
              required
            />
          </div>

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