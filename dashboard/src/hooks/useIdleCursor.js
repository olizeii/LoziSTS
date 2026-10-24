import { useEffect } from 'react';

// Versteckt den Mauszeiger nach kurzer Inaktivität (sauberer TV-Look)
export function useIdleCursor(timeoutMs = 2500) {
  useEffect(() => {
    let timer;
    const root = document.documentElement;
    const wake = () => {
      root.classList.remove('cursor-hidden');
      clearTimeout(timer);
      timer = setTimeout(() => root.classList.add('cursor-hidden'), timeoutMs);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('mousedown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('mousedown', wake);
      root.classList.remove('cursor-hidden');
    };
  }, [timeoutMs]);
}
