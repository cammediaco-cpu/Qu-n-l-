import React, { useState, useEffect, useRef } from 'react';
import { translations, DEFAULT_PROFILE_NAME } from '../constants';

interface ProfileManagerProps {
  profiles: string[];
  activeProfile: string;
  onAddProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
  onSwitchProfile: (name: string) => void;
  isDarkMode: boolean;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ profiles, activeProfile, onAddProfile, onDeleteProfile, onSwitchProfile, isDarkMode }) => {
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
        className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors duration-300`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute bottom-full left-0 mb-2 w-64 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} rounded-lg shadow-xl border ${isDarkMode ? 'border-white' : 'border-black'} z-10 p-4`}>
          <h3 className="font-bold text-lg mb-3">{translations.profiles.manage}</h3>
          
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {profiles.map(profile => (
              <button
                key={profile}
                onClick={() => { onSwitchProfile(profile); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
                  activeProfile === profile 
                    ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')
                    : (isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10')
                }`}
              >
                {profile}
              </button>
            ))}
          </div>

          <div className={`border-t ${isDarkMode ? 'border-white' : 'border-black'} pt-3 opacity-50`}>
            <label htmlFor="new-profile" className="text-sm font-medium">{translations.profiles.add}</label>
            <div className="flex gap-2 mt-1">
              <input
                id="new-profile"
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={translations.profiles.placeholder}
                className={`flex-grow px-2 py-1 text-sm rounded-md ${isDarkMode ? 'bg-white/10' : 'bg-black/10'} border ${isDarkMode ? 'border-white' : 'border-black'} focus:outline-none focus:ring-1 ${isDarkMode ? 'focus:ring-white' : 'focus:ring-black'}`}
              />
              <button onClick={handleAdd} className={`${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} font-bold px-3 py-1 text-sm rounded-md transition`}>
                +
              </button>
            </div>
            {activeProfile !== DEFAULT_PROFILE_NAME && (
              <button
                onClick={() => onDeleteProfile(activeProfile)}
                className="w-full mt-4 text-sm text-red-500 hover:bg-red-500/10 py-1 rounded-md transition-colors"
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

export default ProfileManager;