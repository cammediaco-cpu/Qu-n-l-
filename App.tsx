
import React, { useState, useCallback, useEffect, useMemo, useRef, CSSProperties } from 'react';
import Clock from './components/Clock';
import TodayTasks from './components/TodayTasks';
import Controls from './components/Controls';
import WeekView from './components/TaskList';
import ScheduleModal from './components/TaskInput';
import SettingsModal from './components/SettingsModal';
import NotificationPopup from './components/NotificationPopup';
import ImportProfileModal, { ImportOptions } from './components/ImportProfileModal';
import ProfileManager from './components/ProfileManager';
import { Schedule, ModalState, AppSettings, Category, ProfileData } from './types';
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

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=3000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=2940&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2942&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2940&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=2940&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=3000&auto=format&fit=crop',
];

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

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<ProfileData | null>(null);
  
  const [bgIndex, setBgIndex] = useState(() => Math.floor(Math.random() * BACKGROUND_IMAGES.length));
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBgIndex(prevIndex => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(intervalId);
  }, []);

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
            [settings.workStartTime]: `Chào buổi sáng ${userName}. Đã đến giờ làm việc rồi, bắt đầu một ngày thật năng suất nhé!`,
            [settings.lunchStartTime]: `${userName} ơi, đã đến giờ nghỉ trưa. Tạm gác công việc lại và đi ăn thôi! Đừng quên chăm sóc sức khoẻ nhé.`,
            [settings.lunchEndTime]: `Đến giờ làm việc buổi chiều rồi ${userName}. Cùng tiếp tục nào!`,
            [settings.workEndTime]: `Đã hết giờ làm việc. Chúc ${userName} có một buổi tối vui vẻ!`,
        };
        
        if (currentDay >= 1 && currentDay <= 5) {
            for (const time in workdayNotifications) {
                const key = `workday-${time}`;
                if (time && currentTime === time && !firedNotifications.has(key)) {
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
  
  const handleCloseImportModal = useCallback(() => {
    setIsImportModalOpen(false);
    setPendingImportData(null);
  }, []);

  const handleConfirmImport = useCallback((options: ImportOptions) => {
    if (!pendingImportData) return;

    if (options.importSchedules) {
      setSchedules(pendingImportData.schedules);
    }
    if (options.importSettings) {
      setSettings(pendingImportData.settings);
    }
    if (options.importCategories) {
      setCategories(pendingImportData.categories);
    }

    alert(translations.profiles.importSuccess);
    handleCloseImportModal();
  }, [pendingImportData, setSchedules, setSettings, setCategories, handleCloseImportModal]);

  const handleImportProfile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable");
            
            const parsedData = JSON.parse(text);

            if (Array.isArray(parsedData.schedules) && typeof parsedData.settings === 'object' && Array.isArray(parsedData.categories)) {
                setPendingImportData(parsedData);
                setIsImportModalOpen(true);
            } else {
                throw new Error("Invalid profile file structure");
            }
        } catch (error) {
            console.error("Failed to import profile:", error);
            alert(translations.profiles.importError);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
  }, []);

  const themeClass = isDarkMode ? 'text-white' : 'text-black';
  const backgroundOverlay = isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)';
  const viewBgClass = isDarkMode ? 'bg-black/30 backdrop-blur-xl border border-white/20' : 'bg-white/50 backdrop-blur-xl border border-black/20';

  const appStyle: CSSProperties = {
    backgroundImage: `linear-gradient(${backgroundOverlay}, ${backgroundOverlay}), url(${BACKGROUND_IMAGES[bgIndex]})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    transition: 'background-image 1.5s ease-in-out',
  };

  return (
    <div 
        ref={appRef}
        className={`w-screen h-screen flex items-center justify-center p-4 cursor-pointer transition-colors duration-500 select-none overflow-hidden relative ${themeClass}`}
        style={appStyle}
        onClick={handleToggleTheme}
    >
      <div 
        className="w-full h-full max-w-[1920px] max-h-[1080px] aspect-video relative flex flex-col shadow-2xl rounded-2xl overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-6 left-6 z-10 cursor-default" onClick={(e) => e.stopPropagation()}>
           <ProfileManager
              profiles={profiles}
              activeProfile={activeProfile}
              onAddProfile={handleAddProfile}
              onDeleteProfile={handleDeleteProfile}
              onSwitchProfile={handleSwitchProfile}
              onExportProfile={handleExportProfile}
              onImportProfile={handleImportProfile}
              isDarkMode={isDarkMode}
           />
        </div>
        <div className="absolute top-6 right-6 z-10 cursor-default" onClick={(e) => e.stopPropagation()}>
           <Controls 
              onAddTask={() => handleOpenModal(null)} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              isDarkMode={isDarkMode}
           />
        </div>

        <main 
            className="flex-grow grid grid-cols-2 grid-rows-2 h-full cursor-default"
        >
            {/* Top Left - Clock */}
            <div className="flex items-center justify-center">
                <Clock />
            </div>

            {/* Top Right - Today's Tasks */}
            <div className="flex items-center justify-center">
                <TodayTasks 
                    schedules={schedules} 
                    categories={categories}
                    onToggleComplete={handleToggleComplete} 
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Bottom - WeekView */}
            <div className="col-span-2 row-start-2 p-6 pt-0">
                 <div className={`w-full h-full rounded-2xl shadow-lg p-4 flex flex-col overflow-hidden ${viewBgClass}`}>
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
      </div>
      
      {modalState.isOpen && (
        <ScheduleModal
          schedule={modalState.schedule}
          onSave={handleSaveSchedule}
          onClose={handleCloseModal}
          categories={categories}
          setCategories={setCategories}
          schedules={schedules}
          setSchedules={setSchedules}
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
      {isImportModalOpen && (
// Fix: Removed extraneous properties that are not defined in ImportProfileModalProps.
        <ImportProfileModal
            isOpen={isImportModalOpen}
            onClose={handleCloseImportModal}
            onConfirm={handleConfirmImport}
            isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default App;
