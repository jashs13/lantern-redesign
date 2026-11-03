export function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3.5 mt-4">
      <h2 className="shrink-0 text-lg font-bold text-blue-900">{title}</h2>
      {subtitle && <span className="text-xs text-neutral-400">{subtitle}</span>}
      <div className="h-px flex-1 self-center bg-neutral-200" />
    </div>
  );
}
