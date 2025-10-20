import React, { useState, useEffect } from 'react';

interface NotificationPopupProps {
  message: string;
  countdownTarget?: Date;
  onClose: () => void;
  isDarkMode: boolean;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ message, countdownTarget, onClose, isDarkMode }) => {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!countdownTarget) return;

    const calculateCountdown = () => {
      const now = new Date().getTime();
      const distance = countdownTarget.getTime() - now;

      if (distance < 0) {
        setCountdown('00:00');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    const interval = setInterval(calculateCountdown, 1000);
    calculateCountdown(); // Initial call to avoid 1s delay

    return () => clearInterval(interval);
  }, [countdownTarget]);

  const themeClasses = {
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-white' : 'border-black',
    closeButton: isDarkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-xl p-8 rounded-lg shadow-2xl z-50 animate-fade-in border ${themeClasses.bg} ${themeClasses.text} ${themeClasses.border}`}
        role="alert"
        aria-live="assertive"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${themeClasses.closeButton}`}
          aria-label="Close notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {countdown && (
          <div className="text-center mb-4">
            <p className="text-9xl font-mono font-bold tracking-tighter">{countdown}</p>
          </div>
        )}
        
        <p className={`text-center font-medium ${countdown ? 'text-2xl' : 'text-3xl'}`}>{message}</p>
        
        <style>{`
          @keyframes fade-in {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotificationPopup;
