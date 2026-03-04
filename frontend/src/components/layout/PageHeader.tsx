import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  children?: React.ReactNode;
  titleClassName?: string;
}

export function PageHeader({ title, subtitle, breadcrumbs, children, titleClassName }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={titleClassName || "font-serif text-2xl font-bold text-navy-900"}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
