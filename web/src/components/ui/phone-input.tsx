// web/src/components/ui/phone-input.tsx
// Phone input with +91 prefix locked — user enters only their 10-digit number.
// The displayed value is just the 10 digits; the parent state stores "+91XXXXXXXXXX".

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Extract just the 10 user-typed digits from any input string.
 * Handles all of these safely:
 *   "9"               → "9"
 *   "98"              → "98"
 *   "+919876543210"   → "9876543210"  (strips our own +91 prefix)
 *   "919876543210"    → "9876543210"  (strips 91 prefix without +)
 *   "98765 43210"     → "9876543210"  (strips spaces)
 *   "00919876543210"  → "9876543210"  (last 10 digits)
 */
function extract10Digits(s: string): string {
  if (!s) return '';
  // If the value starts with +91 (our locked prefix), strip it before taking digits
  // so the "91" inside the prefix doesn't bleed into the user's number.
  if (s.startsWith('+91')) {
    return s.slice(3).replace(/\D/g, '').slice(-10);
  }
  // For arbitrary pasted input — extract all digits, take the last 10.
  // If a leading "91" was pasted (without the +), it'll naturally be sliced off
  // since Indian mobiles are 10 digits.
  return s.replace(/\D/g, '').slice(-10);
}

export function PhoneInput({
  value,
  onChange,
  placeholder = '98765 43210',
  id,
  required,
  autoComplete = 'tel-national',
  className,
  disabled,
}: PhoneInputProps) {
  // The displayed value is always just the 10 user-typed digits (no +91 prefix).
  const displayValue = extract10Digits(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // User typed into the 10-digit input. Extract digits (in case they pasted),
    // enforce 10-char max, then prepend our locked +91 prefix for storage.
    const next10 = e.target.value.replace(/\D/g, '').slice(-10);
    const full = next10 ? `+91${next10}` : '';
    onChange(full);
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium select-none pointer-events-none"
        aria-hidden="true"
      >
        +91
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300 bg-transparent px-3 pl-12 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 focus-visible:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

