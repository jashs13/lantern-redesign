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
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <Download size={16} />
      {label}
    </button>
  );
}
