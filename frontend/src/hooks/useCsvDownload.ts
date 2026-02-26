import { useCallback } from 'react';

/**
 * Trigger a file download by opening a URL in a new tab.
 */
export function useCsvDownload() {
  const download = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  return { download };
}
