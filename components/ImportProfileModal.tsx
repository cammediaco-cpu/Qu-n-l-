import React, { useState } from 'react';
import { translations } from '../constants';

export interface ImportOptions {
  importSchedules: boolean;
  importSettings: boolean;
  importCategories: boolean;
}

interface ImportProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ImportOptions) => void;
  isDarkMode: boolean;
}

const ImportProfileModal: React.FC<ImportProfileModalProps> = ({ isOpen, onClose, onConfirm, isDarkMode }) => {
  const [options, setOptions] = useState<ImportOptions>({
    importSchedules: true,
    importSettings: true,
    importCategories: true,
  });

  const handleCheckboxChange = (option: keyof ImportOptions) => {
    setOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const handleConfirm = () => {
    onConfirm(options);
  };

  if (!isOpen) return null;
  
  const themeClasses = {
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-white' : 'border-black',
    button: isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80',
    buttonSecondary: isDarkMode ? 'border border-white hover:bg-white/10' : 'border border-black hover:bg-black/10',
    accentColor: isDarkMode ? 'accent-white' : 'accent-black',
  };

  const Checkbox = ({ id, label, checked, onChange }: { id: keyof ImportOptions, label: string, checked: boolean, onChange: (id: keyof ImportOptions) => void }) => (
    <div className={`p-4 border rounded-lg transition-colors ${isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/10'}`}>
        <label htmlFor={id} className="flex items-center cursor-pointer">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => onChange(id)}
                className={`h-5 w-5 rounded-sm border-2 bg-transparent ${themeClasses.accentColor}`}
            />
            <span className="ml-3 font-medium">{label}</span>
        </label>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`${themeClasses.bg} ${themeClasses.text} rounded-lg shadow-xl p-6 w-full max-w-md relative border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">{translations.profiles.confirmImportTitle}</h2>
        <p className="text-sm opacity-80 mb-6">{translations.profiles.confirmImportMessage}</p>

        <div className="space-y-3">
            <Checkbox id="importSchedules" label={translations.profiles.importOptionSchedules} checked={options.importSchedules} onChange={handleCheckboxChange} />
            <Checkbox id="importSettings" label={translations.profiles.importOptionSettings} checked={options.importSettings} onChange={handleCheckboxChange} />
            <Checkbox id="importCategories" label={translations.profiles.importOptionCategories} checked={options.importCategories} onChange={handleCheckboxChange} />
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={onClose} className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}>
            {translations.cancel}
          </button>
          <button type="button" onClick={handleConfirm} className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.button}`}>
            {translations.profiles.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportProfileModal;
