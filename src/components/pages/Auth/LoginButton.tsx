/**
 * File Name: LoginButton.tsx
 * Description: Custom login button used on the Login page (replaces library Button component).
 * Developer: Jaimin
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-07
 */

"use client";

import React from "react";
import { IconType } from "react-icons";

type LoginButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  iconTrailing?: IconType;
};

export default function LoginButton({
  children,
  iconTrailing: Icon,
  className = "",
  ...rest
}: LoginButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex gap-2.5 items-center justify-center ${className}`}
    >
      <span className="leading-none">{children}</span>
      {Icon ? (
        <Icon className=" w-[15px] h-auto" aria-hidden="true" />
      ) : null}
    </button>
  );
}
