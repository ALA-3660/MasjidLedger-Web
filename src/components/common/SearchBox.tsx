import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  isLoading?: boolean;
  className?: string;
  id?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'অনুসন্ধান করুন...',
  debounceMs = 300,
  isLoading = false,
  className = '',
  id,
}) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, debounceMs]);

  const handleClear = () => {
    setInternalValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        id={id}
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-white font-medium text-stone-800 placeholder-stone-400 transition"
      />
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
      ) : internalValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded-md transition"
          title="মুছুন"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
};
