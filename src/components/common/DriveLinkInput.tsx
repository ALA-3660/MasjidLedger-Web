import React, { useState, useEffect } from 'react';
import { HardDrive, ExternalLink, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { validateGoogleDriveUrl, GoogleDriveValidationResult } from '../../lib/urlValidator';

interface DriveLinkInputProps {
  value: string;
  onChange: (url: string, validation: GoogleDriveValidationResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const DriveLinkInput: React.FC<DriveLinkInputProps> = ({
  value,
  onChange,
  placeholder = 'https://drive.google.com/file/d/.../view?usp=sharing',
  label = 'গুগল ড্রাইভ লিংক (Google Drive URL)',
  required = false,
  className = '',
}) => {
  const [internalUrl, setInternalUrl] = useState(value || '');
  const [validation, setValidation] = useState<GoogleDriveValidationResult>({ isValid: false });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInternalUrl(value || '');
    if (value && value.trim()) {
      const res = validateGoogleDriveUrl(value);
      setValidation(res);
    } else {
      setValidation({ isValid: false });
    }
  }, [value]);

  const handleChange = (newVal: string) => {
    setInternalUrl(newVal);
    if (!newVal.trim()) {
      const emptyRes: GoogleDriveValidationResult = { isValid: false };
      setValidation(emptyRes);
      onChange('', emptyRes);
      return;
    }

    const res = validateGoogleDriveUrl(newVal);
    setValidation(res);
    onChange(newVal, res);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-stone-700 flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-stone-400 hover:text-blue-600 inline-flex items-center gap-1 text-[11px] transition"
        >
          <HelpCircle className="w-3 h-3" />
          <span>কীভাবে লিংক পাবেন?</span>
        </button>
      </div>

      {showHelp && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1 animate-in fade-in duration-150">
          <p className="font-semibold">গুগল ড্রাইভ ফাইলের সঠিক শেয়ারিং লিংক নিয়ম:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800">
            <li>Google Drive-এ ফাইলটি আপলোড করে রাইট-ক্লিক করুন।</li>
            <li><strong>Share &gt; Copy link</strong> অপশন চাপুন।</li>
            <li>General access: <em>"Anyone with the link (Viewer)"</em> নিশ্চিত করুন।</li>
            <li>কপি করা লিংকটি নিচের বক্সে পেস্ট করুন।</li>
          </ol>
        </div>
      )}

      <div className="relative">
        <input
          type="url"
          value={internalUrl}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-xs border rounded-xl outline-hidden font-medium transition ${
            internalUrl.trim()
              ? validation.isValid
                ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-stone-900'
                : 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20 text-stone-900'
              : 'border-stone-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-stone-800'
          }`}
        />
        {internalUrl.trim() && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {validation.isValid ? (
              <span title="বৈধ গুগল ড্রাইভ লিংক" className="text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            ) : (
              <span title="অবৈধ লিংক" className="text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </span>
            )}
            {validation.isValid && (
              <a
                href={internalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition"
                title="ড্রাইভে পরীক্ষা করুন"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {internalUrl.trim() && !validation.isValid && (
        <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{validation.errorMessageBn || 'সঠিক Google Drive লিংক প্রদান করুন।'}</span>
        </p>
      )}
    </div>
  );
};
