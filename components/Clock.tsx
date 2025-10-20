import React, { useState, useEffect } from 'react';

// Helper to interpret WMO weather codes into Vietnamese
const getWeatherDescription = (code: number): string => {
  const descriptions: { [key: number]: string } = {
    0: 'Trời quang',
    1: 'Trời trong',
    2: 'Ít mây',
    3: 'Nhiều mây',
    45: 'Sương mù',
    48: 'Sương mù dày đặc',
    51: 'Mưa phùn nhẹ',
    53: 'Mưa phùn',
    55: 'Mưa phùn dày',
    56: 'Mưa phùn đông lạnh',
    57: 'Mưa phùn đông lạnh dày',
    61: 'Mưa nhỏ',
    63: 'Mưa vừa',
    65: 'Mưa to',
    66: 'Mưa đông lạnh nhẹ',
    67: 'Mưa đông lạnh to',
    71: 'Tuyết rơi nhẹ',
    73: 'Tuyết rơi vừa',
    75: 'Tuyết rơi dày',
    77: 'Hạt tuyết',
    80: 'Mưa rào nhẹ',
    81: 'Mưa rào vừa',
    82: 'Mưa rào to',
    85: 'Mưa tuyết nhẹ',
    86: 'Mưa tuyết dày',
    95: 'Dông',
    96: 'Dông có mưa đá nhẹ',
    99: 'Dông có mưa đá to',
  };
  return descriptions[code] || "Không xác định";
};


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
        // Fetch city name from BigDataCloud API for better accuracy
        const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`);
        const geoData = await geoResponse.json();
        const locationName = geoData.locality || geoData.city || geoData.principalSubdivision || '';

        // Fetch weather data from Open-Meteo's forecast API
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const weatherData = await weatherResponse.json();
        
        if (weatherData && weatherData.current) {
          const temp = Math.round(weatherData.current.temperature_2m);
          const weatherCode = weatherData.current.weather_code;
          const description = getWeatherDescription(weatherCode);
          
          setWeather(`${locationName ? locationName + ', ' : ''}${description} - ${temp}°C`);
        } else {
            setWeather("Không thể lấy dữ liệu thời tiết.");
        }
      } catch (error) {
        console.error("Error fetching weather:", error);
        setWeather("Không thể lấy dữ liệu thời tiết.");
      }
    };

    const fetchLocationAndWeather = async () => {
        try {
            // Using a free IP geolocation service for more consistent results on devices without GPS
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) {
                throw new Error('IP-based geolocation request failed');
            }
            const data = await response.json();
            if (data.latitude && data.longitude) {
                fetchWeather(data.latitude, data.longitude);
            } else {
                 setWeather("Không thể xác định vị trí qua IP.");
            }
        } catch (error) {
            console.error("Error fetching location by IP:", error);
            setWeather("Không thể xác định vị trí.");
        }
    };
    
    fetchLocationAndWeather();
    // Fetch weather every 30 minutes
    const weatherInterval = setInterval(fetchLocationAndWeather, 30 * 60 * 1000);
    
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
      <h1 className="text-[10rem] leading-none font-bold tracking-tight">
        {formatTime(time).slice(0, 5)} 
        <span className="align-baseline text-8xl font-bold">{formatTime(time).slice(5)}</span>
      </h1>
      <p className="text-3xl mt-4 opacity-80">{formatDate(time)}</p>
      {weather && <p className="text-2xl mt-2 opacity-80">{weather}</p>}
    </div>
  );
};

export default Clock;