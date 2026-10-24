import { useCallback, useEffect, useRef, useState } from 'react';

// Wechselt automatisch durch die Dashboard-Seiten; pausiert z. B. während einer Feier
export function usePageRotation(pageCount, seconds, paused) {
  const [page, setPage] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const timer = useRef(null);
  const stopped = paused || manualPause;

  useEffect(() => {
    if (stopped) return undefined;
    timer.current = setTimeout(() => {
      setPage((p) => (p + 1) % pageCount);
      setCycleKey((k) => k + 1);
    }, seconds * 1000);
    return () => clearTimeout(timer.current);
  }, [page, cycleKey, stopped, pageCount, seconds]);

  // Seite direkt anzeigen und den Countdown neu starten
  const showPage = useCallback(
    (index) => {
      setPage(((index % pageCount) + pageCount) % pageCount);
      setCycleKey((k) => k + 1);
    },
    [pageCount],
  );

  const next = useCallback(() => showPage(page + 1), [page, showPage]);
  const prev = useCallback(() => showPage(page - 1), [page, showPage]);
  const togglePause = useCallback(() => setManualPause((p) => !p), []);

  return { page, cycleKey, stopped, manualPause, showPage, next, prev, togglePause };
}
