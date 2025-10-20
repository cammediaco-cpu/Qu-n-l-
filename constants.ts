export const LOCAL_STORAGE_PROFILES_KEY = 'weekly-schedule-app-profiles';
export const LOCAL_STORAGE_ACTIVE_PROFILE_KEY = 'weekly-schedule-app-activeProfile';
export const LOCAL_STORAGE_SCHEDULES_BASE_KEY = 'weekly-schedule-app-schedules';
export const LOCAL_STORAGE_SETTINGS_BASE_KEY = 'weekly-schedule-app-settings';
export const LOCAL_STORAGE_CATEGORIES_BASE_KEY = 'weekly-schedule-app-categories';
export const DEFAULT_PROFILE_NAME = 'Mặc định';

export const DEFAULT_CATEGORIES = [];

export const DEFAULT_RINGTONES = [
  { name: 'chuông 01', url: 'https://cdn.pixabay.com/audio/2023/06/01/audio_77fe776ce5.mp3' },
  { name: 'chuông 02', url: 'https://cdn.pixabay.com/audio/2025/01/11/audio_5e34842448.mp3' },
  { name: 'chuông 03', url: 'https://cdn.pixabay.com/audio/2023/01/08/audio_85c2c37fef.mp3' },
  { name: 'chuông 04', url: 'https://cdn.pixabay.com/audio/2025/09/25/audio_3ce458fb2a.mp3' },
  { name: 'chuông 05', url: 'https://cdn.pixabay.com/audio/2025/09/25/audio_1c2207d92b.mp3' },
];

export const DEFAULT_SETTINGS = {
  ringtoneUrl: DEFAULT_RINGTONES[0].name,
  ringtoneDuration: 3, // seconds
  voiceURI: 'default',
  volume: 0.8, // 80%
  notificationPrefix: 'Đã đến giờ:',
  preNotificationEnabled: false,
  preNotificationTime: 5, // 5 minutes
  preNotificationPrefix: 'Sắp đến giờ:',
  workdayNotificationsEnabled: true,
  userName: 'Sếp',
  workStartTime: '08:30',
  lunchStartTime: '12:00',
  lunchEndTime: '13:30',
  workEndTime: '17:00',
};


export const translations = {
  appTitle: 'Lịch Trình Tuần Của Tôi',
  todayTasksTitle: 'Công Việc Hôm Nay',
  allTasksCompleted: 'Tất cả công việc đã hoàn thành! 🎉',
  noTasksToday: 'Hôm nay không có công việc nào.',
  addSchedule: 'Thêm Lịch Trình',
  editSchedule: 'Chỉnh Sửa Lịch Trình',
  time: 'Thời gian',
  content: 'Nội dung',
  category: 'Phân loại',
  addCategory: 'Thêm loại mới',
  categoryName: 'Tên loại',
  none: 'Không có',
  days: 'Các ngày trong tuần',
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  edit: 'Sửa',
  errorNoDaySelected: 'Vui lòng chọn ít nhất một ngày.',
  remindBefore: 'Nhắc trước',
  remindOptions: {
    0: 'Đúng giờ',
    5: '5 phút trước',
    10: '10 phút trước',
    15: '15 phút trước',
    30: '30 phút trước',
  },
  weekdays: [
    'Chủ Nhật', // Sunday
    'Thứ Hai',  // Monday
    'Thứ Ba',   // Tuesday
    'Thứ Tư',   // Wednesday
    'Thứ Năm',   // Thursday
    'Thứ Sáu',   // Friday
    'Thứ Bảy',  // Saturday
  ],
  profiles: {
    manage: 'Quản lý Hồ sơ',
    add: 'Thêm hồ sơ',
    placeholder: 'Tên hồ sơ mới...',
    delete: 'Xóa hồ sơ',
    confirmDelete: 'Bạn có chắc muốn xóa hồ sơ này không? Tất cả lịch trình và cài đặt của hồ sơ này sẽ bị mất vĩnh viễn.',
    cannotDeleteDefault: 'Không thể xóa hồ sơ mặc định.',
    profileName: 'Hồ sơ',
    exportProfile: 'Tải xuống hồ sơ',
    importProfile: 'Tải lên hồ sơ',
    confirmImport: 'Bạn có chắc muốn tải lên hồ sơ này không? Dữ liệu hiện tại của hồ sơ sẽ bị ghi đè.',
    importSuccess: 'Hồ sơ đã được áp dụng thành công!',
    importError: 'Tệp không hợp lệ hoặc đã bị lỗi. Vui lòng kiểm tra lại.',
    confirmImportTitle: 'Tùy chọn Tải lên Hồ sơ',
    confirmImportMessage: 'Chọn dữ liệu bạn muốn áp dụng cho hồ sơ hiện tại. Các mục được chọn sẽ ghi đè lên dữ liệu hiện có.',
    importOptionSchedules: 'Lịch trình & Công việc',
    importOptionSettings: 'Cài đặt thông báo & Giao diện',
    importOptionCategories: 'Phân loại',
    confirm: 'Áp dụng',
  },
  settings: {
    title: 'Cài Đặt Thông Báo',
    ringtone: 'Nhạc chuông',
    uploadRingtone: 'Tải lên nhạc chuông',
    uploaded: 'Đã tải lên',
    duration: 'Thời lượng chuông (giây)',
    voice: 'Giọng đọc',
    defaultVoice: 'Mặc định',
    volume: 'Âm lượng',
    notificationPrefixLabel: 'Văn bản lời nhắc chính',
    notificationPrefixPlaceholder: 'Ví dụ: Sắp tới giờ làm...',
    preview: 'Nghe thử',
    close: 'Đóng',
    previewText: 'Đây là giọng nói thông báo của bạn.',
    preNotificationTitle: 'Cài đặt nhắc trước (toàn cục)',
    enablePreNotification: 'Bật thông báo nhắc trước',
    preNotificationTimeLabel: 'Thời gian nhắc trước',
    preNotificationPrefixLabel: 'Văn bản lời nhắc trước',
    preNotificationPrefixPlaceholder: 'Ví dụ: Chuẩn bị làm...',
    workdayTitle: 'Thông báo giờ làm việc',
    enableWorkdayNotifications: 'Bật thông báo theo giờ làm việc',
    yourNameLabel: 'Tên/Biệt danh của bạn',
    yourNamePlaceholder: 'Ví dụ: Sếp Tâm, Anh A,...',
    workHoursTitle: 'Tùy chỉnh giờ làm việc',
    workStartTime: 'Bắt đầu làm việc',
    lunchStartTime: 'Bắt đầu nghỉ trưa',
    lunchEndTime: 'Kết thúc nghỉ trưa',
    workEndTime: 'Kết thúc làm việc',
    tabMain: 'Âm thanh & Lời nhắc',
    tabAdvanced: 'Nâng cao',
  },
};

export const NOTIFICATION_SOUND_URL = 'https://www.soundjay.com/buttons/sounds/button-16.mp3'; // Kept for backward compatibility if needed, but new settings will override.