import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'stone' | 'rose' | 'indigo';
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeColor = 'emerald',
  icon,
  actions,
  breadcrumbs,
  className = '',
}) => {
  const badgeColorClasses = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs print:hidden ${className}`}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-stone-400 mb-1.5 font-medium">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="hover:text-stone-700 transition"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-stone-600">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900 tracking-tight font-siliguri">
                {title}
              </h1>
              {badgeText && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badgeColorClasses[badgeColor]}`}
                >
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
