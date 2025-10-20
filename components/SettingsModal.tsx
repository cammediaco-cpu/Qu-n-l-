import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { translations, DEFAULT_RINGTONES } from '../constants';

// ========= IndexedDB Utilities for Ringtones =========
const DB_NAME = 'WeeklyScheduleRingtoneDB';
const DB_VERSION = 1;
const STORE_NAME = 'ringtones';

interface RingtoneRecord {
  id?: number;
  name: string;
  file: File;
}

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const addRingtoneToDB = async (ringtone: RingtoneRecord): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.add(ringtone);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

const getRingtonesFromDB = async (): Promise<RingtoneRecord[]> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
};

const deleteRingtoneFromDB = async (id: number): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
};
// =======================================================

interface RingtoneOption {
  id?: number;
  name: string;
  url: string;
}

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose, isDarkMode }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [allRingtones, setAllRingtones] = useState<RingtoneOption[]>([...DEFAULT_RINGTONES]);
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneOption | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);

  const loadCustomRingtones = async () => {
    try {
      const customRingtonesFromDB = await getRingtonesFromDB();
      const customRingtoneOptions = customRingtonesFromDB.map(r => ({
        id: r.id!,
        name: r.name,
        url: URL.createObjectURL(r.file),
      }));
      setAllRingtones([...DEFAULT_RINGTONES, ...customRingtoneOptions]);
    } catch (error) {
      console.error("Failed to load custom ringtones:", error);
      setAllRingtones([...DEFAULT_RINGTONES]);
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const vietnameseVoices = allVoices.filter(v => v.lang.startsWith('vi'));
      setVoices(vietnameseVoices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    loadCustomRingtones();

    return () => {
      allRingtones.forEach(r => {
        if (r.url.startsWith('blob:')) {
          URL.revokeObjectURL(r.url);
        }
      });
    };
  }, []);

  useEffect(() => {
    const current = allRingtones.find(r => r.url === localSettings.ringtoneUrl);
    setSelectedRingtone(current);
  }, [localSettings.ringtoneUrl, allRingtones]);


  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      try {
        await addRingtoneToDB({ name: file.name, file });
        alert(`Nhạc chuông "${file.name}" đã được thêm.`);
        await loadCustomRingtones();
      } catch (error) {
        console.error("Error adding ringtone:", error);
        alert("Không thể thêm nhạc chuông.");
      }
    } else {
      alert('Vui lòng chọn một file âm thanh.');
    }
  };

  const handleDeleteRingtone = async () => {
      if (selectedRingtone && selectedRingtone.id) {
          if (window.confirm(`Bạn có chắc muốn xóa nhạc chuông "${selectedRingtone.name}" không?`)) {
              try {
                  await deleteRingtoneFromDB(selectedRingtone.id);
                  handleChange('ringtoneUrl', DEFAULT_RINGTONES[0].url);
                  await loadCustomRingtones();
              } catch (error) {
                  console.error("Error deleting ringtone:", error);
                  alert("Không thể xóa nhạc chuông.");
              }
          }
      }
  };

  const handlePreview = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    window.speechSynthesis.cancel();

    const audio = new Audio(localSettings.ringtoneUrl);
    audio.volume = localSettings.volume;
    audio.play().catch(e => console.error("Error playing preview sound:", e));
    audioRef.current = audio;

    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, localSettings.ringtoneDuration * 1000);
    
    previewTimeoutRef.current = setTimeout(() => {
      if ('speechSynthesis' in window && translations.settings.previewText) {
          const fullText = `${localSettings.notificationPrefix} ${translations.settings.previewText}`;
          const utterance = new SpeechSynthesisUtterance(fullText);
          const selectedVoice = voices.find(v => v.voiceURI === localSettings.voiceURI);
          if (selectedVoice) {
              utterance.voice = selectedVoice;
          }
          utterance.lang = selectedVoice?.lang || 'vi-VN';
          utterance.volume = localSettings.volume;
          window.speechSynthesis.speak(utterance);
      }
    }, (localSettings.ringtoneDuration * 1000) + 500);
  };
  
  const handleSave = () => {
    onSave(localSettings);
  };
  
  const themeClasses = {
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-white' : 'border-black',
    input: isDarkMode ? 'bg-white/10 border-white/50 focus:border-white' : 'bg-black/10 border-black/50 focus:border-black',
    option: isDarkMode ? 'bg-black text-white' : 'bg-white text-black',
    button: isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80',
    buttonSecondary: isDarkMode ? 'border border-white hover:bg-white/10' : 'border border-black hover:bg-black/10',
    accentColor: isDarkMode ? 'accent-white' : 'accent-black',
    rangeTrack: isDarkMode ? 'bg-white/20' : 'bg-black/20',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
      <div className={`${themeClasses.bg} ${themeClasses.text} rounded-lg shadow-xl p-6 w-full max-w-md relative overflow-y-auto max-h-[90vh] border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">{translations.settings.title}</h2>
        
        <div className="space-y-4 text-sm">
          {/* Main Notification Settings */}
          <div>
            <label htmlFor="ringtone" className="block font-medium mb-1 opacity-80">{translations.settings.ringtone}</label>
            <div className="flex items-center gap-2">
              <select
                id="ringtone"
                value={localSettings.ringtoneUrl}
                onChange={(e) => handleChange('ringtoneUrl', e.target.value)}
                className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`}
              >
                {allRingtones.map(ringtone => (
                  <option className={themeClasses.option} key={ringtone.url} value={ringtone.url}>{ringtone.name}</option>
                ))}
              </select>
               {selectedRingtone?.id && (
                <button
                    type="button"
                    onClick={handleDeleteRingtone}
                    title={`Xóa nhạc chuông "${selectedRingtone.name}"`}
                    className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="opacity-80 hover:underline mt-2 text-sm">
                {translations.settings.uploadRingtone}
            </button>
            <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label htmlFor="duration" className="block font-medium mb-1 opacity-80">{translations.settings.duration}: {localSettings.ringtoneDuration}s</label>
            <input id="duration" type="range" min="1" max="10" step="1" value={localSettings.ringtoneDuration} onChange={(e) => handleChange('ringtoneDuration', Number(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${themeClasses.rangeTrack} ${themeClasses.accentColor}`} />
          </div>

          <div>
            <label htmlFor="prefix" className="block font-medium mb-1 opacity-80">{translations.settings.notificationPrefixLabel}</label>
            <input id="prefix" type="text" placeholder={translations.settings.notificationPrefixPlaceholder} value={localSettings.notificationPrefix} onChange={(e) => handleChange('notificationPrefix', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`} />
          </div>

          <div>
            <label htmlFor="voice" className="block font-medium mb-1 opacity-80">{translations.settings.voice}</label>
            <select id="voice" value={localSettings.voiceURI} onChange={(e) => handleChange('voiceURI', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`}>
              <option className={themeClasses.option} value="default">{translations.settings.defaultVoice}</option>
              {voices.map(voice => ( <option className={themeClasses.option} key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option> ))}
            </select>
          </div>

          <div>
            <label htmlFor="volume" className="block font-medium mb-1 opacity-80">{translations.settings.volume}: {Math.round(localSettings.volume * 100)}%</label>
            <input id="volume" type="range" min="0" max="1" step="0.05" value={localSettings.volume} onChange={(e) => handleChange('volume', Number(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${themeClasses.rangeTrack} ${themeClasses.accentColor}`} />
          </div>

          {/* Pre-notification Settings */}
          <div className={`border-t pt-4 mt-6 ${isDarkMode ? 'border-white/20' : 'border-black/20'}`}>
            <h3 className="text-lg font-semibold mb-2">{translations.settings.preNotificationTitle}</h3>
            <div className="flex items-center">
              <input type="checkbox" id="preNotificationEnabled" checked={localSettings.preNotificationEnabled} onChange={(e) => handleChange('preNotificationEnabled', e.target.checked)} className={`h-4 w-4 rounded border-2 bg-transparent ${themeClasses.accentColor}`} />
              <label htmlFor="preNotificationEnabled" className="ml-2 block font-medium opacity-80">{translations.settings.enablePreNotification}</label>
            </div>
            
            {localSettings.preNotificationEnabled && (
              <div className={`space-y-4 mt-4 pl-2 border-l-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <div>
                  <label htmlFor="preNotificationTime" className="block font-medium mb-1 opacity-80">{translations.settings.preNotificationTimeLabel}</label>
                  <select id="preNotificationTime" value={localSettings.preNotificationTime} onChange={(e) => handleChange('preNotificationTime', Number(e.target.value))} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`}>
                    {Object.entries(translations.remindOptions).filter(([min]) => Number(min) > 0).map(([minutes, label]) => ( <option className={themeClasses.option} key={minutes} value={minutes}>{label}</option> ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="preNotificationPrefix" className="block font-medium mb-1 opacity-80">{translations.settings.preNotificationPrefixLabel}</label>
                  <input id="preNotificationPrefix" type="text" placeholder={translations.settings.preNotificationPrefixPlaceholder} value={localSettings.preNotificationPrefix} onChange={(e) => handleChange('preNotificationPrefix', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`} />
                </div>
              </div>
            )}
          </div>
          
          {/* Workday Notification Settings */}
          <div className={`border-t pt-4 mt-6 ${isDarkMode ? 'border-white/20' : 'border-black/20'}`}>
            <h3 className="text-lg font-semibold mb-2">{translations.settings.workdayTitle}</h3>
            <div className="flex items-center">
              <input type="checkbox" id="workdayNotificationsEnabled" checked={localSettings.workdayNotificationsEnabled} onChange={(e) => handleChange('workdayNotificationsEnabled', e.target.checked)} className={`h-4 w-4 rounded border-2 bg-transparent ${themeClasses.accentColor}`} />
              <label htmlFor="workdayNotificationsEnabled" className="ml-2 block font-medium opacity-80">{translations.settings.enableWorkdayNotifications}</label>
            </div>
             {localSettings.workdayNotificationsEnabled && (
                <div className={`mt-4 pl-2 border-l-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                    <label htmlFor="userName" className="block font-medium mb-1 opacity-80">{translations.settings.yourNameLabel}</label>
                    <input id="userName" type="text" placeholder={translations.settings.yourNamePlaceholder} value={localSettings.userName} onChange={(e) => handleChange('userName', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`} />
                </div>
             )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
            <button type="button" onClick={handlePreview} className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}>
              {translations.settings.preview}
            </button>
            <div className="flex gap-4">
                 <button type="button" onClick={onClose} className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}>
                    {translations.settings.close}
                </button>
                <button type="button" onClick={handleSave} className={`font-bold py-2 px-4 rounded-lg transition-colors ${themeClasses.button}`}>
                    {translations.save}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;