import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface TaskCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

/**
 * Landing page "What Can You Do?" task card.
 */
export function TaskCard({ icon, title, description, href }: TaskCardProps) {
  return (
    <Link
      to={href}
      className="group flex flex-col rounded-lg border border-neutral-200 bg-white p-6 shadow-card transition-all no-underline hover:shadow-card-hover"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
        {icon}
      </div>
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{description}</p>
      <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-navy-700 transition-colors group-hover:text-sky-600">
        Learn More
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
