export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
