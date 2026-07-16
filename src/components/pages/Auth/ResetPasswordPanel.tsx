/**
 * File Name: ResetPasswordPanel.tsx
 * Description: Set-new-password form reached via the emailed reset link.
 * Developer: KP-184
 * Created Date: 2026-07-14
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { FaChevronRight } from "react-icons/fa6";
import { z } from "zod";

import LoginButton from "@/components/pages/Auth/LoginButton";
import { Input } from "@/components/base/input/input";
import { reset_password_request } from "@/services/auth-client.service";
import { notifyError } from "@/utils/notifications";
import { PUBLIC_ROUTES } from "@/config/routes";

interface ResetPasswordPanelProps {
  resetKey: string;
  login: string;
}

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Please confirm your password."),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const figma_input_wrapper_class =
  "rounded-none bg-white shadow-none border border-[#666666] px-3 py-3 h-12 shadow-none";
const figma_input_text_class =
  "text-link text-[#989898] placeholder:text-[#989898] shadow-none";

export default function ResetPasswordPanel({
  resetKey,
  login,
}: ResetPasswordPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { password: "", confirm_password: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      const { ok, data } = await reset_password_request({
        key: resetKey,
        login,
        password: values.password,
        confirm_password: values.confirm_password,
      });

      if (!ok) {
        const msg = data.message || "Password reset failed. Please try again.";

        if (data.code === "password_mismatch") {
          setError("confirm_password", { type: "server", message: msg });
        } else if (data.code === "weak_password") {
          setError("password", { type: "server", message: msg });
        } else {
          setError("password", { type: "server", message: msg });
        }
        return;
      }

      setSucceeded(true);
    } catch {
      notifyError("Password reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <div className="bg-white px-8 py-10 shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
        <h2 className="mb-6 text-center font-condensed text-[28px] font-bold uppercase tracking-wide text-blue">
          Password Reset
        </h2>
        <p className="mb-8 text-center text-sm text-dark-gray">
          Your password has been reset successfully. You can now log in with
          your new password.
        </p>
        <div className="flex justify-center">
          <Link
            href={PUBLIC_ROUTES.login}
            className="inline-flex h-[47px] min-w-[167px] items-center justify-center gap-2 rounded-none bg-amber px-8 font-condensed text-[18px] font-bold uppercase text-white transition-opacity hover:bg-[#b38600]"
          >
            Go to Login <FaChevronRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white px-8 py-10 shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
      <h2 className="mb-8 text-center font-condensed text-[28px] font-bold uppercase tracking-wide text-blue">
        Set New Password
      </h2>

      <p className="mb-6 text-center text-sm text-dark-gray">
        Enter and confirm your new password below.
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="password"
              placeholder="New Password"
              autoComplete="new-password"
              size="sm"
              isInvalid={Boolean(errors.password)}
              hint={errors.password?.message}
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figma_input_wrapper_class}
              inputClassName={figma_input_text_class}
            />
          )}
        />

        <Controller
          name="confirm_password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="password"
              placeholder="Confirm New Password"
              autoComplete="new-password"
              size="sm"
              isInvalid={Boolean(errors.confirm_password)}
              hint={errors.confirm_password?.message}
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figma_input_wrapper_class}
              inputClassName={figma_input_text_class}
            />
          )}
        />

        <div className="flex justify-center pt-3">
          <LoginButton
            type="submit"
            disabled={isSubmitting}
            className="min-w-[167px] h-[47px] rounded-none bg-amber px-8 py-3.5 font-condensed text-[18px] font-bold uppercase text-white hover:bg-[#b38600]"
            iconTrailing={FaChevronRight}
          >
            {isSubmitting ? "Saving..." : "Save New Password"}
          </LoginButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-dark-gray">
        Link expired?{" "}
        <Link
          href={PUBLIC_ROUTES.forgotPassword}
          className="font-semibold text-blue transition-colors hover:text-navy"
        >
          Request a new one
        </Link>
      </p>
    </div>
  );
}
