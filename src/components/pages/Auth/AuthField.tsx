/**
 * File Name: AuthField.tsx
 * Description: Auth form field with label, required indicator, and error slot.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { cn } from "@/lib/utils";

import { authErrorClass } from "@/components/pages/Auth/auth-classes";

interface AuthFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export default function AuthField({
  label,
  htmlFor,
  required = false,
  error,
  className,
  children,
}: AuthFieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 text-sm font-semibold text-dark-gray"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>

      {children}

      <p
        className={cn("mt-1 min-h-5 text-sm", error ? authErrorClass : "invisible")}
        aria-live="polite"
      >
        {error || "\u00A0"}
      </p>
    </div>
  );
}
