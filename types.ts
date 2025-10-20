export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Schedule {
  id:string;
  day: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  time: string;
  text: string;
  isCompleted: boolean;
  categoryId?: string;
}

export type ModalState = {
  isOpen: boolean;
  schedule: Schedule | null;
};

export interface AppSettings {
  ringtoneUrl: string;
  ringtoneDuration: number; // in seconds
  voiceURI: string;
  volume: number; // 0 to 1
  notificationPrefix: string;
  // Global Pre-notification settings
  preNotificationEnabled: boolean;
  preNotificationTime: number; // in minutes
  preNotificationPrefix: string;
  // Workday notifications
  workdayNotificationsEnabled: boolean;
  userName: string;
  workStartTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  workEndTime: string;
}

export interface ProfileData {
  schedules: Schedule[];
  settings: AppSettings;
  categories: Category[];
}