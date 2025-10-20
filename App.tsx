import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Clock from './components/Clock';
import TodayTasks from './components/TodayTasks';
import Controls from './components/Controls';
import WeekView from './components/TaskList';
import ScheduleModal from './components/TaskInput';
import SettingsModal from './components/SettingsModal';
import NotificationPopup from './components/NotificationPopup';
import { Schedule, ModalState, AppSettings, Category } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import {
  LOCAL_STORAGE_SCHEDULES_BASE_KEY,
  LOCAL_STORAGE_SETTINGS_BASE_KEY,
  LOCAL_STORAGE_PROFILES_KEY,
  LOCAL_STORAGE_ACTIVE_PROFILE_KEY,
  LOCAL_STORAGE_CATEGORIES_BASE_KEY,
  DEFAULT_SETTINGS,
  DEFAULT_PROFILE_NAME,
  DEFAULT_CATEGORIES,
  DEFAULT_RINGTONES,
  translations,
} from './constants';

// ========= IndexedDB Utilities for Ringtones =========
const DB_NAME = 'WeeklyScheduleRingtoneDB';
const DB_VERSION = 1;
const STORE_NAME = 'ringtones';

interface RingtoneRecord {
  id?: number;
  name: string;
  file: File;
}
interface RingtoneOption {
  name: string;
  url: string;
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
// =======================================================


interface NotificationPopupData {
  id: string;
  message: string;
  countdownTarget?: Date;
}

const App: React.FC = () => {
  const [profiles, setProfiles] = useLocalStorage<string[]>(LOCAL_STORAGE_PROFILES_KEY, [DEFAULT_PROFILE_NAME]);
  const [activeProfile, setActiveProfile] = useLocalStorage<string>(LOCAL_STORAGE_ACTIVE_PROFILE_KEY, DEFAULT_PROFILE_NAME);

  const schedulesKey = useMemo(() => `${LOCAL_STORAGE_SCHEDULES_BASE_KEY}-${activeProfile}`, [activeProfile]);
  const settingsKey = useMemo(() => `${LOCAL_STORAGE_SETTINGS_BASE_KEY}-${activeProfile}`, [activeProfile]);
  const categoriesKey = useMemo(() => `${LOCAL_STORAGE_CATEGORIES_BASE_KEY}-${activeProfile}`, [activeProfile]);


  const [schedules, setSchedules] = useLocalStorage<Schedule[]>(schedulesKey, []);
  const [settings, setSettings] = useLocalStorage<AppSettings>(settingsKey, DEFAULT_SETTINGS);
  const [categories, setCategories] = useLocalStorage<Category[]>(categoriesKey, DEFAULT_CATEGORIES);

  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, schedule: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [firedNotifications, setFiredNotifications] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePopup, setActivePopup] = useState<NotificationPopupData | null>(null);
  const [allRingtones, setAllRingtones] = useState<RingtoneOption[]>([...DEFAULT_RINGTONES]);
  
  const appRef = useRef<HTMLDivElement>(null);

  const loadRingtones = useCallback(async () => {
    // Revoke old blob URLs before creating new ones to prevent memory leaks
    setAllRingtones(prevRingtones => {
        prevRingtones.forEach(r => {
            if (r.url.startsWith('blob:')) {
                URL.revokeObjectURL(r.url);
            }
        });
        return [...DEFAULT_RINGTONES]; // Reset to default before adding custom
    });

    try {
      const customRingtonesFromDB = await getRingtonesFromDB();
      const customRingtoneOptions = customRingtonesFromDB.map(r => ({
        name: r.name,
        url: URL.createObjectURL(r.file),
      }));
      setAllRingtones(prev => [...prev, ...customRingtoneOptions]);
    } catch (error) {
      console.error("Failed to load custom ringtones:", error);
    }
  }, []);

  useEffect(() => {
    loadRingtones();

    return () => {
      // Final cleanup of blob URLs when the main app unmounts
      allRingtones.forEach(r => {
        if (r.url.startsWith('blob:')) {
          URL.revokeObjectURL(r.url);
        }
      });
    };
  }, [loadRingtones]);


  useEffect(() => {
    if (!profiles.includes(activeProfile)) {
      setActiveProfile(DEFAULT_PROFILE_NAME);
    }
  }, [profiles, activeProfile, setActiveProfile]);
  
  const handleToggleTheme = (e: React.MouseEvent) => {
    // Only toggle if the click is on the root background element itself
    if (e.target === appRef.current) {
        setIsDarkMode(prev => !prev);
    }
  };


  const triggerUnifiedNotification = useCallback((speechJobs: { text: string }[]) => {
    if (speechJobs.length === 0) return;
    
    // Find the ringtone URL from the identifier (name) stored in settings
    const ringtoneIdentifier = settings.ringtoneUrl;
    let ringtone = allRingtones.find(r => r.name === ringtoneIdentifier);
    
    // Fallback for old data where a URL might have been stored
    if (!ringtone) {
        ringtone = allRingtones.find(r => r.url === ringtoneIdentifier);
    }
    
    const urlToPlay = ringtone ? ringtone.url : DEFAULT_RINGTONES[0].url; // Final fallback

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const audio = new Audio(urlToPlay);
    audio.volume = settings.volume;
    audio.play().catch(e => console.error("Error playing sound:", e));
    
    setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
    }, settings.ringtoneDuration * 1000);

    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const allVoices = window.speechSynthesis.getVoices();
        const selectedVoice = allVoices.find(v => v.voiceURI === settings.voiceURI);
        
        speechJobs.forEach(job => {
          const utterance = new SpeechSynthesisUtterance(job.text);
          utterance.lang = selectedVoice?.lang || 'vi-VN';
          utterance.volume = settings.volume;
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          window.speechSynthesis.speak(utterance);
        });
      }
    }, (settings.ringtoneDuration * 1000) + 500);
  }, [settings, allRingtones]);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      if (currentTime === '00:00') {
        setFiredNotifications(new Set());
        return;
      }
      
      const speechJobs: { text: string }[] = [];
      const notificationKeysToFire: string[] = [];
      let newPopupData: NotificationPopupData | null = null;

      schedules.forEach(s => {
        if (s.isCompleted || s.day !== currentDay) {
            return;
        }

        const mainNotificationKey = `${s.id}-main`;
        if (s.time === currentTime && !firedNotifications.has(mainNotificationKey)) {
          const message = `${settings.notificationPrefix} ${s.text}`;
          speechJobs.push({ text: message});
          notificationKeysToFire.push(mainNotificationKey);
          newPopupData = { id: mainNotificationKey, message };
        }

        if (settings.preNotificationEnabled) {
          const preNotificationKey = `${s.id}-pre`;
          const [hour, minute] = s.time.split(':').map(Number);
          const scheduleDate = new Date();
          scheduleDate.setHours(hour, minute, 0, 0);
          const notificationTime = new Date(scheduleDate.getTime() - settings.preNotificationTime * 60000);
          const notificationTimeString = notificationTime.toTimeString().slice(0, 5);

          if (notificationTimeString === currentTime && !firedNotifications.has(preNotificationKey)) {
             const message = `${settings.preNotificationPrefix} ${s.text}`;
             speechJobs.push({ text: message});
             notificationKeysToFire.push(preNotificationKey);
             newPopupData = { id: preNotificationKey, message, countdownTarget: scheduleDate };
          }
        }
      });

      if (settings.workdayNotificationsEnabled) {
        const userName = settings.userName || 'bạn';
        const workdayNotifications: { [key: string]: string } = {
          '08:30': `Chào buổi sáng ${userName}. Đã đến giờ làm việc rồi, bắt đầu một ngày thật năng suất nhé!`,
          '12:00': `${userName} ơi, đã đến giờ nghỉ trưa. Tạm gác công việc lại và đi ăn thôi! Đừng quên chăm sóc sức khoẻ nhé.`,
          '13:30': `Đến giờ làm việc buổi chiều rồi ${userName}. Cùng tiếp tục nào!`,
          '17:00': `Đã hết giờ làm việc. Chúc ${userName} có một buổi tối vui vẻ!`,
        };
        
        if (currentDay >= 1 && currentDay <= 5) {
            for (const time in workdayNotifications) {
                const key = `workday-${time}`;
                if (currentTime === time && !firedNotifications.has(key)) {
                    const message = workdayNotifications[time];
                    speechJobs.push({ text: message });
                    notificationKeysToFire.push(key);
                    newPopupData = { id: key, message };
                }
            }
        }
      }
      
      if (speechJobs.length > 0) {
        triggerUnifiedNotification(speechJobs);
        setFiredNotifications(prev => {
          const newFired = new Set(prev);
          notificationKeysToFire.forEach(key => newFired.add(key));
          return newFired;
        });
      }

      if (newPopupData) {
        setActivePopup(newPopupData);
      }
    };

    const intervalId = setInterval(checkNotifications, 1000);

    return () => clearInterval(intervalId);
  }, [schedules, firedNotifications, settings, triggerUnifiedNotification]);


  const handleOpenModal = useCallback((schedule: Schedule | null = null) => {
    setModalState({ isOpen: true, schedule });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, schedule: null });
  }, []);

  const handleSaveSchedule = useCallback((data: { time: string; text: string; categoryId?: string }, selectedDays: number[]) => {
    if (modalState.schedule) {
      setSchedules(schedules.map(s =>
        s.id === modalState.schedule!.id ? { ...s, time: data.time, text: data.text, categoryId: data.categoryId, isCompleted: false } : s
      ));
    } else {
      const newSchedules: Schedule[] = selectedDays.map(day => ({
        id: new Date().toISOString() + Math.random(),
        day,
        time: data.time,
        text: data.text,
        categoryId: data.categoryId,
        isCompleted: false,
      }));
      setSchedules([...schedules, ...newSchedules]);
    }
    handleCloseModal();
  }, [schedules, setSchedules, modalState.schedule, handleCloseModal]);
  
  const handleDeleteSchedule = useCallback((id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
  }, [schedules, setSchedules]);
  
  const handleToggleComplete = useCallback((id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, isCompleted: !s.isCompleted } : s
    ));
  }, [schedules, setSchedules]);

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
      setSettings(newSettings);
      setIsSettingsOpen(false);
  }, [setSettings]);

  const handleAddProfile = useCallback((profileName: string) => {
    const trimmedName = profileName.trim();
    if (trimmedName && !profiles.includes(trimmedName)) {
      const newProfiles = [...profiles, trimmedName];
      setProfiles(newProfiles);
      setActiveProfile(trimmedName);
    }
  }, [profiles, setProfiles, setActiveProfile]);

  const handleDeleteProfile = useCallback((profileName: string) => {
    if (profileName === DEFAULT_PROFILE_NAME) {
      alert(translations.profiles.cannotDeleteDefault);
      return;
    }
    if (window.confirm(translations.profiles.confirmDelete)) {
      window.localStorage.removeItem(`${LOCAL_STORAGE_SCHEDULES_BASE_KEY}-${profileName}`);
      window.localStorage.removeItem(`${LOCAL_STORAGE_SETTINGS_BASE_KEY}-${profileName}`);
      window.localStorage.removeItem(`${LOCAL_STORAGE_CATEGORIES_BASE_KEY}-${profileName}`);

      const newProfiles = profiles.filter(p => p !== profileName);
      setProfiles(newProfiles);

      if (activeProfile === profileName) {
        setActiveProfile(DEFAULT_PROFILE_NAME);
      }
    }
  }, [profiles, setProfiles, activeProfile, setActiveProfile]);

  const handleSwitchProfile = useCallback((profileName: string) => {
    if (profiles.includes(profileName)) {
      setActiveProfile(profileName);
    }
  }, [profiles, setActiveProfile]);

  const handleExportProfile = useCallback(() => {
    const dataToExport = {
        schedules,
        settings,
        categories,
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile-${activeProfile}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [schedules, settings, categories, activeProfile]);

  const handleImportProfile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(translations.profiles.confirmImport)) {
        event.target.value = ''; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable");
            
            const parsedData = JSON.parse(text);

            // Basic validation
            if (Array.isArray(parsedData.schedules) && typeof parsedData.settings === 'object' && Array.isArray(parsedData.categories)) {
                setSchedules(parsedData.schedules);
                setSettings(parsedData.settings);
                setCategories(parsedData.categories);
                alert(translations.profiles.importSuccess);
            } else {
                throw new Error("Invalid profile file structure");
            }
        } catch (error) {
            console.error("Failed to import profile:", error);
            alert(translations.profiles.importError);
        } finally {
            event.target.value = ''; // Reset file input regardless of success/fail
        }
    };
    reader.readAsText(file);
  }, [setSchedules, setSettings, setCategories]);

  const themeClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-black';

  return (
    <div 
        ref={appRef}
        className={`w-screen h-screen flex flex-col cursor-pointer transition-colors duration-500 select-none overflow-hidden ${themeClass}`}
        onClick={handleToggleTheme}
    >
        <main 
            className="flex-grow grid grid-cols-2 grid-rows-2 cursor-default" 
            onClick={(e) => e.stopPropagation()}
        >
            {/* Top Left */}
            <div className="flex items-center justify-center">
                <Clock />
            </div>

            {/* Top Right */}
            <div className="flex items-center justify-center">
                <TodayTasks 
                    schedules={schedules} 
                    categories={categories}
                    onToggleComplete={handleToggleComplete} 
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Bottom */}
            <div className="col-span-2 row-start-2 flex items-center justify-center p-8">
                 <div className="w-full h-full max-w-7xl flex flex-col">
                    <WeekView
                        schedules={schedules}
                        categories={categories}
                        onEdit={handleOpenModal}
                        onDelete={handleDeleteSchedule}
                        isDarkMode={isDarkMode}
                    />
                </div>
            </div>
        </main>
      
        <footer className="cursor-default" onClick={(e) => e.stopPropagation()}>
            <Controls 
                onAddTask={() => handleOpenModal(null)} 
                onOpenSettings={() => setIsSettingsOpen(true)}
                profiles={profiles}
                activeProfile={activeProfile}
                onAddProfile={handleAddProfile}
                onDeleteProfile={handleDeleteProfile}
                onSwitchProfile={handleSwitchProfile}
                onExportProfile={handleExportProfile}
                onImportProfile={handleImportProfile}
                isDarkMode={isDarkMode}
            />
        </footer>
      
      {modalState.isOpen && (
        <ScheduleModal
          schedule={modalState.schedule}
          onSave={handleSaveSchedule}
          onClose={handleCloseModal}
          categories={categories}
          setCategories={setCategories}
          isDarkMode={isDarkMode}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
          allRingtones={allRingtones}
          onRingtoneUpdate={loadRingtones}
        />
      )}
      {activePopup && (
        <NotificationPopup
          key={activePopup.id}
          message={activePopup.message}
          countdownTarget={activePopup.countdownTarget}
          onClose={() => setActivePopup(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default App;