
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<string | null>('Đang tải thời tiết...');

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        if (!process.env.API_KEY) {
            setWeather('Thiếu API key của Gemini.');
            return;
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Cung cấp thông tin thời tiết ngắn gọn (ví dụ: "Nắng", "Có mưa") và nhiệt độ theo độ C cho vị trí có vĩ độ ${lat} và kinh độ ${lon}. Định dạng: [Thành phố], [Thời tiết] - nhiệt độ [Nhiệt độ]`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        setWeather(response.text);
      } catch (error) {
        console.error("Error fetching weather:", error);
        setWeather("Không thể lấy dữ liệu thời tiết.");
      }
    };

    const getLocationAndFetchWeather = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude);
          },
          () => {
            setWeather("Không thể truy cập vị trí.");
          }
        );
      } else {
          setWeather("Trình duyệt không hỗ trợ định vị.");
      }
    };
    
    getLocationAndFetchWeather();
    // Fetch weather every 30 minutes
    const weatherInterval = setInterval(getLocationAndFetchWeather, 30 * 60 * 1000);
    
    return () => clearInterval(weatherInterval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const dateString = date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return dateString.replace('ngày ', '');
  };

  return (
    <div className="text-left transition-colors duration-500 flex-shrink-0">
      <h1 className="text-[10rem] leading-none font-bold tracking-tighter">
        {formatTime(time).slice(0, 5)} 
        <span className="align-baseline text-8xl font-bold">{formatTime(time).slice(5)}</span>
      </h1>
      <p className="text-3xl mt-4 opacity-80">{formatDate(time)}</p>
      {weather && <p className="text-2xl mt-2 opacity-80">{weather}</p>}
    </div>
  );
};

export default Clock;
