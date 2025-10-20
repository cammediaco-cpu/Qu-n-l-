import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Clock from './components/Clock';
import TodayTasks from './components/TodayTasks';
import Controls from './components/Controls';
import WeekView from './components/TaskList';
import ScheduleModal from './components/TaskInput';
import SettingsModal from './components/SettingsModal';
import NotificationPopup from './components/NotificationPopup';
import { Schedule, ModalState, AppSettings } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import {
  LOCAL_STORAGE_SCHEDULES_BASE_KEY,
  LOCAL_STORAGE_SETTINGS_BASE_KEY,
  LOCAL_STORAGE_PROFILES_KEY,
  LOCAL_STORAGE_ACTIVE_PROFILE_KEY,
  DEFAULT_SETTINGS,
  DEFAULT_PROFILE_NAME,
  translations,
} from './constants';

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

  const [schedules, setSchedules] = useLocalStorage<Schedule[]>(schedulesKey, []);
  const [settings, setSettings] = useLocalStorage<AppSettings>(settingsKey, DEFAULT_SETTINGS);

  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, schedule: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [firedNotifications, setFiredNotifications] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePopup, setActivePopup] = useState<NotificationPopupData | null>(null);
  
  const appRef = useRef<HTMLDivElement>(null);

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

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const audio = new Audio(settings.ringtoneUrl);
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
  }, [settings]);

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
          '13:00': `Đến giờ làm việc buổi chiều rồi ${userName}. Cùng tiếp tục nào!`,
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

  const handleSaveSchedule = useCallback((data: { time: string; text: string; }, selectedDays: number[]) => {
    if (modalState.schedule) {
      setSchedules(schedules.map(s =>
        s.id === modalState.schedule!.id ? { ...s, time: data.time, text: data.text, isCompleted: false } : s
      ));
    } else {
      const newSchedules: Schedule[] = selectedDays.map(day => ({
        id: new Date().toISOString() + Math.random(),
        day,
        time: data.time,
        text: data.text,
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
                    onToggleComplete={handleToggleComplete} 
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Bottom */}
            <div className="col-span-2 row-start-2 flex items-center justify-center p-8">
                 <div className="w-full h-full max-w-7xl flex flex-col">
                    <WeekView
                        schedules={schedules}
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
                isDarkMode={isDarkMode}
            />
        </footer>
      
      {modalState.isOpen && (
        <ScheduleModal
          schedule={modalState.schedule}
          onSave={handleSaveSchedule}
          onClose={handleCloseModal}
          isDarkMode={isDarkMode}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
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
