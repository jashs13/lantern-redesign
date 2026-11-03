import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  children?: React.ReactNode;
  titleClassName?: string;
  /** Inline text next to the title, e.g. a "data updated" timestamp — not a separate card. */
  titleExtra?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, children, titleClassName, titleExtra }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className={titleClassName || "font-sans text-2xl font-bold text-blue-900"}>{title}</h1>
            {titleExtra}
          </div>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
