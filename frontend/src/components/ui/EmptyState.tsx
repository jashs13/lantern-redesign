import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox size={48} strokeWidth={1} />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}
