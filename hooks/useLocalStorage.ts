// Fix: Import React to resolve 'Cannot find namespace' errors.
import React, { useState, useEffect } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  useEffect(() => {
    try {
        const item = window.localStorage.getItem(key);
        // If the key changes and there's no item, reset to the initial value.
        setStoredValue(item ? JSON.parse(item) : initialValue);
    } catch(e) {
        console.error("Failed to parse from local storage", e);
        setStoredValue(initialValue); // Fallback to initialValue on error
    }
    // Use stringify to prevent re-renders from object references for initialValue
  }, [key, JSON.stringify(initialValue)]);


  return [storedValue, setValue];
}

export default useLocalStorage;