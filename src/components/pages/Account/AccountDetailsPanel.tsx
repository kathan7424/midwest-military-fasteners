/**
 * File Name: AccountDetailsPanel.tsx
 * Description: My Account → Account Details — editable form for name, email,
 *   company, display name, and password change (WooCommerce standard).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useState } from "react";

import type { AccountUser } from "@/components/pages/Account/MyAccountView";
import {
  FIELD_ERROR_CLASS,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
} from "@/components/shared_Ui/form-styles";
import PasswordField from "@/components/shared_Ui/PasswordField";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import {
  change_password,
  update_account_details,
} from "@/services/account.client";
import { notifyError, notifySuccess } from "@/utils/notifications";

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return <p className={FIELD_ERROR_CLASS}>{message}</p>;
}

export default function AccountDetailsPanel({
  user,
}: {
  user: AccountUser | null;
}) {
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [company, setCompany] = useState(user?.company ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!user) {
    return (
      <div className="max-w-2xl space-y-4">
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    );
  }

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    if (!email.trim()) errors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Please enter a valid email address.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDetails = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateDetails()) return;

    setIsSaving(true);

    const { ok, data } = await update_account_details({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      company: company.trim(),
    });

    if (ok) {
      notifySuccess("Account details saved.");
    } else {
      notifyError(data.message || "Could not save account details.");
    }

    setIsSaving(false);
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: Record<string, string> = {};

    if (!currentPassword) errors.currentPassword = "Current password is required.";
    if (!newPassword) errors.newPassword = "New password is required.";
    else if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters.";
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    setIsChangingPassword(true);

    const { ok, data } = await change_password({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    if (ok) {
      notifySuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      notifyError(data.message || "Could not change password.");
    }

    setIsChangingPassword(false);
  };

  return (
    <div className="max-w-2xl space-y-10">
      {/* Account details form */}
      <form onSubmit={handleSaveDetails} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL_CLASS}>
              First name <span className="text-[#E12222]">*</span>
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, firstName: "" }));
              }}
              className={`${INPUT_CLASS} ${fieldErrors.firstName ? INPUT_ERROR_CLASS : ""}`}
              autoComplete="given-name"
            />
            <FieldError message={fieldErrors.firstName ?? ""} />
          </label>

          <label className="block">
            <span className={LABEL_CLASS}>
              Last name <span className="text-[#E12222]">*</span>
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, lastName: "" }));
              }}
              className={`${INPUT_CLASS} ${fieldErrors.lastName ? INPUT_ERROR_CLASS : ""}`}
              autoComplete="family-name"
            />
            <FieldError message={fieldErrors.lastName ?? ""} />
          </label>

          <div className="sm:col-span-2">
            <label className="block">
              <span className={LABEL_CLASS}>
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="nickname"
              />
              <p className="mt-1 text-xs text-mid-gray">
                This will be how your name is displayed in the account section and in reviews.
              </p>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block">
              <span className={LABEL_CLASS}>
                Email address <span className="text-[#E12222]">*</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                className={`${INPUT_CLASS} ${fieldErrors.email ? INPUT_ERROR_CLASS : ""}`}
                autoComplete="email"
              />
              <FieldError message={fieldErrors.email ?? ""} />
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block">
              <span className={LABEL_CLASS}>
                Company
              </span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="organization"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 inline-flex items-center bg-amber px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Password change form */}
      <form onSubmit={handleChangePassword} noValidate>
        <h3 className="mb-4 text-body font-bold uppercase text-near-black">
          Password change
        </h3>

        <div className="space-y-4">
          <label className="block">
            <span className={LABEL_CLASS}>
              Current password (leave blank to leave unchanged)
            </span>
            <PasswordField
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, currentPassword: "" }));
              }}
              isInvalid={Boolean(fieldErrors.currentPassword)}
              autoComplete="current-password"
            />
            <FieldError message={fieldErrors.currentPassword ?? ""} />
          </label>

          <label className="block">
            <span className={LABEL_CLASS}>
              New password (leave blank to leave unchanged)
            </span>
            <PasswordField
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              isInvalid={Boolean(fieldErrors.newPassword)}
              autoComplete="new-password"
            />
            <FieldError message={fieldErrors.newPassword ?? ""} />
          </label>

          <label className="block">
            <span className={LABEL_CLASS}>
              Confirm new password
            </span>
            <PasswordField
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              isInvalid={Boolean(fieldErrors.confirmPassword)}
              autoComplete="new-password"
            />
            <FieldError message={fieldErrors.confirmPassword ?? ""} />
          </label>
        </div>

        <button
          type="submit"
          disabled={isChangingPassword}
          className="mt-6 inline-flex items-center bg-navy px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
        >
          {isChangingPassword ? "Changing..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
