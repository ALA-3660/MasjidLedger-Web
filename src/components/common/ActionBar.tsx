import React from 'react';
import { SearchBox } from './SearchBox';

interface ActionBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'অনুসন্ধান করুন...',
  filters,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs print:hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        {onSearchChange && (
          <div className="w-full sm:max-w-xs">
            <SearchBox
              value={searchValue || ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          {actions}
        </div>
      )}
    </div>
  );
};
