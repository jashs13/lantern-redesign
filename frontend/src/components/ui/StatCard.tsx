interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

/**
 * Landing page stat card used in "Network at a Glance" section.
 */
export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-card transition-shadow hover:shadow-card-hover">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-700/10 text-navy-700">
        {icon}
      </div>
      <p className="text-3xl font-bold text-navy-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{label}</p>
    </div>
  );
}
