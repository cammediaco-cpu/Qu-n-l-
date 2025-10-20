import React, { useState, useEffect, useRef } from 'react';
import { translations, DEFAULT_PROFILE_NAME } from '../constants';

// --- ProfileManager Component Definition ---
interface ProfileManagerProps {
  profiles: string[];
  activeProfile: string;
  onAddProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
  onSwitchProfile: (name: string) => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ profiles, activeProfile, onAddProfile, onDeleteProfile, onSwitchProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = () => {
    if (newProfileName.trim()) {
      onAddProfile(newProfileName.trim());
      setNewProfileName('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition duration-300"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold">{activeProfile}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-10 p-4">
          <h3 className="font-bold text-lg mb-3">{translations.profiles.manage}</h3>
          
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {profiles.map(profile => (
              <button
                key={profile}
                onClick={() => { onSwitchProfile(profile); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
                  activeProfile === profile 
                    ? 'bg-sky-500 text-white' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {profile}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
            <label htmlFor="new-profile" className="text-sm font-medium">{translations.profiles.add}</label>
            <div className="flex gap-2 mt-1">
              <input
                id="new-profile"
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={translations.profiles.placeholder}
                className="flex-grow px-2 py-1 text-sm rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button onClick={handleAdd} className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-1 text-sm rounded-md transition">
                +
              </button>
            </div>
            {activeProfile !== DEFAULT_PROFILE_NAME && (
              <button
                onClick={() => onDeleteProfile(activeProfile)}
                className="w-full mt-4 text-sm text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 py-1 rounded-md transition-colors"
              >
                {translations.profiles.delete} "{activeProfile}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// --- Header Component ---
interface HeaderProps {
  onAddTask: () => void;
  onOpenSettings: () => void;
  profiles: string[];
  activeProfile: string;
  onAddProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
  onSwitchProfile: (name: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onAddTask, 
    onOpenSettings,
    profiles,
    activeProfile,
    onAddProfile,
    onDeleteProfile,
    onSwitchProfile
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-300 dark:border-slate-700">
      <h1 className="text-4xl font-bold text-sky-600 dark:text-sky-400">
        {translations.appTitle}
      </h1>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-2xl font-semibold p-2 bg-slate-200 dark:bg-slate-800 rounded-lg shadow hidden sm:block">
          {formatTime(currentTime)}
        </div>

        <ProfileManager
            profiles={profiles}
            activeProfile={activeProfile}
            onAddProfile={onAddProfile}
            onDeleteProfile={onDeleteProfile}
            onSwitchProfile={onSwitchProfile}
        />

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition duration-300"
          aria-label={translations.settings.title}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={onAddTask}
          className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          aria-label={translations.addSchedule}
        >
          {translations.addSchedule}
        </button>
      </div>
    </header>
  );
};

export default Header;