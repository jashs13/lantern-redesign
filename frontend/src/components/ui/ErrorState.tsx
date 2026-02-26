import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-red-500">
      <AlertTriangle size={48} strokeWidth={1} />
      <p className="mt-3 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded bg-navy-700 px-4 py-2 text-sm text-white hover:bg-navy-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}
