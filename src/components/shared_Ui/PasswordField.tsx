/**
 * File Name: PasswordField.tsx
 * Description: Password input with a show/hide toggle, styled to match
 *   INPUT_CLASS (non-auth forms — My Account, checkout, tax upload). Auth
 *   forms (Login/Register/Reset) already get this from the Untitled UI
 *   base Input component — this is the equivalent for everywhere else.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

import { INPUT_CLASS, INPUT_ERROR_CLASS } from "@/components/shared_Ui/form-styles";
import { cn } from "@/lib/utils";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  isInvalid?: boolean;
}

export default function PasswordField({
  isInvalid,
  className,
  ...props
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        className={cn(
          INPUT_CLASS,
          "pr-11",
          isInvalid && INPUT_ERROR_CLASS,
          className
        )}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((prev) => !prev)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-mid-gray transition-colors hover:text-near-black"
      >
        {isVisible ? (
          <EyeOff className="size-4" strokeWidth={2.25} />
        ) : (
          <Eye className="size-4" strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}
