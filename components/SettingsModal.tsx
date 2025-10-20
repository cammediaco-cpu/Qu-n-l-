import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { translations, DEFAULT_RINGTONES, GEMINI_TTS_VOICES } from '../constants';
import { GoogleGenAI, Modality } from '@google/genai';

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

// ========= Audio Decoding Utilities =========
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
// ===========================================

// Helper component for 24h time selection
interface TimeSelectProps {
  id: string;
  label: string;
  value: string; // e.g., "08:30"
  onChange: (newValue: string) => void;
  themeClasses: { input: string; option: string; };
}

const TimeSelect: React.FC<TimeSelectProps> = ({ id, label, value, onChange, themeClasses }) => {
  // Ensure value is a valid time string, otherwise default.
  const [hour, minute] = (value && value.includes(':')) ? value.split(':') : ['00', '00'];

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = String(e.target.value).padStart(2, '0');
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = String(e.target.value).padStart(2, '0');
    onChange(`${hour}:${newMinute}`);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1 opacity-70">{label}</label>
      <div className="flex items-center gap-2">
        <select
          id={id + '-hour'}
          aria-label={`${label} - Giờ`}
          value={parseInt(hour, 10).toString()}
          onChange={handleHourChange}
          className={`w-full px-3 py-1.5 rounded-md border transition-colors ${themeClasses.input}`}
        >
          {Array.from({ length: 24 }, (_, i) => i).map(h => (
            <option key={h} value={h} className={themeClasses.option}>{String(h).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="font-bold">:</span>
        <select
          id={id + '-minute'}
          aria-label={`${label} - Phút`}
          value={parseInt(minute, 10).toString()}
          onChange={handleMinuteChange}
          className={`w-full px-3 py-1.5 rounded-md border transition-colors ${themeClasses.input}`}
        >
          {Array.from({ length: 60 }, (_, i) => i).map(m => (
            <option key={m} value={m} className={themeClasses.option}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
};


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
  allRingtones: RingtoneOption[];
  onRingtoneUpdate: () => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose, isDarkMode, allRingtones, onRingtoneUpdate }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneOption | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'main' | 'advanced'>('main');


  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  useEffect(() => {
    // This effect syncs the selected ringtone and handles data migration from URL to Name.
    const currentIdentifier = localSettings.ringtoneUrl;
    let ringtone = allRingtones.find(r => r.name === currentIdentifier);

    // If not found by name, try by URL (for migration of old data)
    if (!ringtone && (currentIdentifier?.startsWith('http') || currentIdentifier?.startsWith('blob'))) {
        ringtone = allRingtones.find(r => r.url === currentIdentifier);
    }

    if (ringtone) {
        setSelectedRingtone(ringtone);
        // If the identifier was a URL, update local state to use the name for persistence
        if (localSettings.ringtoneUrl !== ringtone.name) {
            handleChange('ringtoneUrl', ringtone.name);
        }
    } else {
        // Fallback to default if nothing matches (e.g., stale data)
        const defaultRingtone = allRingtones.find(r => r.name === DEFAULT_RINGTONES[0].name) || allRingtones[0];
        if (defaultRingtone && localSettings.ringtoneUrl !== defaultRingtone.name) {
           setSelectedRingtone(defaultRingtone);
           handleChange('ringtoneUrl', defaultRingtone.name);
        }
    }
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
        await onRingtoneUpdate(); // Reload ringtones in App and get new props
        handleChange('ringtoneUrl', file.name); // Select the newly uploaded ringtone
      } catch (error) {
        console.error("Error adding ringtone:", error);
        alert("Không thể thêm nhạc chuông.");
      }
    } else {
      alert('Vui lòng chọn một file âm thanh.');
    }
     if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleDeleteRingtone = async () => {
      if (selectedRingtone && selectedRingtone.id) {
          if (window.confirm(`Bạn có chắc muốn xóa nhạc chuông "${selectedRingtone.name}" không?`)) {
              try {
                  await deleteRingtoneFromDB(selectedRingtone.id);
                  handleChange('ringtoneUrl', DEFAULT_RINGTONES[0].name); // Revert to default
                  await onRingtoneUpdate();
              } catch (error) {
                  console.error("Error deleting ringtone:", error);
                  alert("Không thể xóa nhạc chuông.");
              }
          }
      }
  };

  const handlePreview = async () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const ringtoneToPlay = allRingtones.find(r => r.name === localSettings.ringtoneUrl);
    if (!ringtoneToPlay) {
        console.error("Ringtone not found for preview:", localSettings.ringtoneUrl);
        return;
    }

    const audio = new Audio(ringtoneToPlay.url);
    audio.volume = localSettings.volume;
    audio.play().catch(e => console.error("Error playing preview sound:", e));
    audioRef.current = audio;

    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, localSettings.ringtoneDuration * 1000);
    
    try {
        const fullText = `${localSettings.notificationPrefix} ${translations.settings.previewText}`;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: fullText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: localSettings.geminiVoice },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioContextRef.current,
                24000,
                1,
            );
            
            setTimeout(() => {
                if (!audioContextRef.current) return;
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                const gainNode = audioContextRef.current.createGain();
                gainNode.gain.value = localSettings.volume;
                source.connect(gainNode);
                gainNode.connect(audioContextRef.current.destination);
                source.start();
                audioSourceRef.current = source;
            }, (localSettings.ringtoneDuration * 1000) + 500);
        }
    } catch (error) {
        console.error("Error generating preview speech:", error);
    }
  };
  
  const handleSave = () => {
    onSave(localSettings);
  };
  
  const themeClasses = {
    bg: isDarkMode ? 'bg-black/30 backdrop-blur-xl' : 'bg-white/50 backdrop-blur-xl',
    text: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-white/20' : 'border-black/20',
    input: isDarkMode ? 'bg-white/10 border-white/50 focus:border-white' : 'bg-black/10 border-black/50 focus:border-black',
    option: isDarkMode ? 'bg-black text-white' : 'bg-white text-black',
    button: isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80',
    buttonSecondary: isDarkMode ? 'border border-white hover:bg-white/10' : 'border border-black hover:bg-black/10',
    accentColor: isDarkMode ? 'accent-white' : 'accent-black',
    rangeTrack: isDarkMode ? 'bg-white/20' : 'bg-black/20',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={onClose}>
      <div className={`${themeClasses.bg} ${themeClasses.text} rounded-2xl shadow-xl p-6 w-full max-w-md relative flex flex-col max-h-[90vh] border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 flex-shrink-0">{translations.settings.title}</h2>

        {/* Tab Navigation */}
        <div className={`flex-shrink-0 border-b mb-4 ${themeClasses.border}`}>
            <button
                onClick={() => setActiveTab('main')}
                className={`py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'main'
                    ? (isDarkMode ? 'border-white text-white' : 'border-black text-black')
                    : `border-transparent opacity-60 hover:opacity-100 ${isDarkMode ? 'text-white' : 'text-black'}`
                }`}
            >
                {translations.settings.tabMain}
            </button>
            <button
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'advanced'
                    ? (isDarkMode ? 'border-white text-white' : 'border-black text-black')
                    : `border-transparent opacity-60 hover:opacity-100 ${isDarkMode ? 'text-white' : 'text-black'}`
                }`}
            >
                {translations.settings.tabAdvanced}
            </button>
        </div>
        
        <div className="overflow-y-auto flex-grow pr-2 -mr-2">
            {activeTab === 'main' && (
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
                            <option className={themeClasses.option} key={ringtone.name} value={ringtone.name}>{ringtone.name}</option>
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
                        <select id="voice" value={localSettings.geminiVoice} onChange={(e) => handleChange('geminiVoice', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`}>
                        {GEMINI_TTS_VOICES.map(voice => ( <option className={themeClasses.option} key={voice.value} value={voice.value}>{voice.name}</option> ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="volume" className="block font-medium mb-1 opacity-80">{translations.settings.volume}: {Math.round(localSettings.volume * 100)}%</label>
                        <input id="volume" type="range" min="0" max="1" step="0.05" value={localSettings.volume} onChange={(e) => handleChange('volume', Number(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${themeClasses.rangeTrack} ${themeClasses.accentColor}`} />
                    </div>
                </div>
            )}
            
            {activeTab === 'advanced' && (
                <div className="space-y-6 text-sm">
                    {/* Pre-notification Settings */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">{translations.settings.preNotificationTitle}</h3>
                        <div className="flex items-center">
                        <input type="checkbox" id="preNotificationEnabled" checked={localSettings.preNotificationEnabled} onChange={(e) => handleChange('preNotificationEnabled', e.target.checked)} className={`h-4 w-4 rounded border-2 bg-transparent ${themeClasses.accentColor}`} />
                        <label htmlFor="preNotificationEnabled" className="ml-2 block font-medium opacity-80">{translations.settings.enablePreNotification}</label>
                        </div>
                        
                        {localSettings.preNotificationEnabled && (
                        <div className={`space-y-4 mt-4 pl-2 border-l-2 ${isDarkMode ? 'border-white/50' : 'border-black/50'}`}>
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
                    <div>
                        <h3 className="text-lg font-semibold mb-2">{translations.settings.workdayTitle}</h3>
                        <div className="flex items-center">
                        <input type="checkbox" id="workdayNotificationsEnabled" checked={localSettings.workdayNotificationsEnabled} onChange={(e) => handleChange('workdayNotificationsEnabled', e.target.checked)} className={`h-4 w-4 rounded border-2 bg-transparent ${themeClasses.accentColor}`} />
                        <label htmlFor="workdayNotificationsEnabled" className="ml-2 block font-medium opacity-80">{translations.settings.enableWorkdayNotifications}</label>
                        </div>
                        {localSettings.workdayNotificationsEnabled && (
                            <div className={`mt-4 pl-2 border-l-2 ${isDarkMode ? 'border-white/50' : 'border-black/50'} space-y-4`}>
                                <div>
                                    <label htmlFor="userName" className="block font-medium mb-1 opacity-80">{translations.settings.yourNameLabel}</label>
                                    <input id="userName" type="text" placeholder={translations.settings.yourNamePlaceholder} value={localSettings.userName} onChange={(e) => handleChange('userName', e.target.value)} className={`w-full px-3 py-2 rounded-md border transition-colors ${themeClasses.input}`} />
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2 opacity-80">{translations.settings.workHoursTitle}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <TimeSelect 
                                            id="workStartTime"
                                            label={translations.settings.workStartTime}
                                            value={localSettings.workStartTime}
                                            onChange={(value) => handleChange('workStartTime', value)}
                                            themeClasses={themeClasses}
                                        />
                                        <TimeSelect 
                                            id="lunchStartTime"
                                            label={translations.settings.lunchStartTime}
                                            value={localSettings.lunchStartTime}
                                            onChange={(value) => handleChange('lunchStartTime', value)}
                                            themeClasses={themeClasses}
                                        />
                                        <TimeSelect 
                                            id="lunchEndTime"
                                            label={translations.settings.lunchEndTime}
                                            value={localSettings.lunchEndTime}
                                            onChange={(value) => handleChange('lunchEndTime', value)}
                                            themeClasses={themeClasses}
                                        />
                                        <TimeSelect 
                                            id="workEndTime"
                                            label={translations.settings.workEndTime}
                                            value={localSettings.workEndTime}
                                            onChange={(value) => handleChange('workEndTime', value)}
                                            themeClasses={themeClasses}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t flex-shrink-0 ${themeClasses.border}">
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