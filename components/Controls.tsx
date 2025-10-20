import React from 'react';
import ProfileManager from './ProfileManager';
import { translations } from '../constants';

interface ControlsProps {
  onAddTask: () => void;
  onOpenSettings: () => void;
  profiles: string[];
  activeProfile: string;
  onAddProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
  onSwitchProfile: (name: string) => void;
  onExportProfile: () => void;
  onImportProfile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
}

const Controls: React.FC<ControlsProps> = (props) => {
    const { onAddTask, onOpenSettings, isDarkMode } = props;
    
    const buttonClass = isDarkMode 
      ? 'hover:bg-white/10' 
      : 'hover:bg-black/10';

    return (
        <div className="w-full">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <ProfileManager {...props} />
                <div className="flex items-center gap-4">
                    <button
                        onClick={onOpenSettings}
                        className={`p-2 rounded-lg ${buttonClass} transition-colors duration-300`}
                        aria-label={translations.settings.title}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={onAddTask}
                        className={`p-2 rounded-lg ${buttonClass} transition-colors duration-300`}
                        aria-label={translations.addSchedule}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Controls;
