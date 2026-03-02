import { Download } from 'lucide-react';
import { useCsvDownload } from '@/hooks/useCsvDownload';

interface DownloadButtonProps {
  url: string;
  label?: string;
}

export function DownloadButton({ url, label = 'Download CSV' }: DownloadButtonProps) {
  const { download } = useCsvDownload();

  return (
    <button
      onClick={() => download(url)}
      className="inline-flex items-center gap-2 font-sans font-bold transition-all"
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        background: 'var(--color-accent-green)',
        color: 'var(--color-white)',
        border: '2px solid var(--color-accent-green)',
        borderRadius: 'var(--border-radius)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#236b34';
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#236b34';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-green)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent-green)';
      }}
    >
      <Download size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
