import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeTone?: 'income' | 'expense' | 'neutral';
  searchText?: string;
}

export interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  variant?: 'light' | 'dark';
  className?: string;
  title?: string;
  clearValue?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'নির্বাচন করুন...',
  searchPlaceholder = 'লিখে খুঁজুন...',
  emptyText = 'কোনো ফলাফল পাওয়া যায়নি',
  variant = 'light',
  className = '',
  title,
  clearValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 240,
    openUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDark = variant === 'dark';

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = `${opt.label} ${opt.subLabel || ''} ${opt.badge || ''} ${opt.searchText || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(Math.max(rect.width, 250), window.innerWidth - 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 270 && rect.top > spaceBelow;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - dropdownWidth - 8);
    }

    setCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left,
      width: dropdownWidth,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (dropdownRef.current && e.target instanceof Node && dropdownRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex] || filteredOptions[0];
      if (target) handleSelect(target.value);
    }
  };

  const canClear = clearValue !== undefined && value !== clearValue;

  const triggerBaseClasses = isDark
    ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700/80 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-semibold'
    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl px-3 py-1.5 text-xs font-medium';

  const badgeClass = (tone?: 'income' | 'expense' | 'neutral') => {
    if (tone === 'income') {
      return isDark
        ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700/60'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    if (tone === 'expense') {
      return isDark
        ? 'bg-rose-900/70 text-rose-300 border border-rose-700/60'
        : 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    return isDark
      ? 'bg-slate-700 text-slate-300'
      : 'bg-slate-100 text-slate-600';
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        title={title || selectedOption?.label || placeholder}
        onClick={() => {
          setIsOpen((prev) => {
            if (!prev) setQuery('');
            return !prev;
          });
        }}
        className={`w-full flex items-center justify-between gap-1.5 text-left outline-hidden transition-colors cursor-pointer ${triggerBaseClasses} ${className}`}
      >
        <span className="truncate flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {canClear && (
            <span
              role="button"
              tabIndex={-1}
              title="রিসেট করুন"
              onClick={(e) => {
                e.stopPropagation();
                onChange(clearValue);
                setIsOpen(false);
                setQuery('');
              }}
              className={`p-0.5 rounded-full transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-600'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : coords.top,
              bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className={`rounded-xl shadow-2xl border overflow-hidden font-baloo ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Search Box Header */}
            <div
              className={`p-2 border-b ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="relative flex items-center">
                <Search
                  className={`w-3.5 h-3.5 absolute left-2.5 pointer-events-none ${
                    isDark ? 'text-slate-400' : 'text-slate-400'
                  }`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg outline-hidden transition-colors ${
                    isDark
                      ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className={`absolute right-2 p-0.5 rounded ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div
                  className={`px-3 py-5 text-center text-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-blue-600/25 text-blue-200 font-bold'
                            : 'bg-blue-50 text-blue-800 font-bold'
                          : isHighlighted
                          ? isDark
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-900'
                          : isDark
                          ? 'text-slate-200 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {opt.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${badgeClass(
                                opt.badgeTone
                              )}`}
                            >
                              {opt.badge}
                            </span>
                          )}
                          <span className="break-words leading-snug">{opt.label}</span>
                        </div>
                        {opt.subLabel && (
                          <div
                            className={`text-[10px] mt-0.5 truncate ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isDark ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
