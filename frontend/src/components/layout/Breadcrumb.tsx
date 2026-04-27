import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-2 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex items-center gap-1 text-neutral-500 no-underline transition-colors hover:text-navy-700"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>

      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-neutral-300" />
          {item.href ? (
            <Link
              to={item.href}
              className="text-neutral-500 no-underline transition-colors hover:text-navy-700"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-neutral-600">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
