/**
 * File Name: LoginPanel.tsx
 * Description: Login form panel (Untitled UI).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { FaChevronRight } from "react-icons/fa6";
import { z } from "zod";

import LoginButton from "@/components/pages/Auth/LoginButton";
import { Input } from "@/components/base/input/input";
import { PUBLIC_ROUTES } from "@/config/routes";
import { login_user } from "@/services/auth-client.service";
import { notifyError, notifySuccess } from "@/utils/notifications";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const figma_input_wrapper_class =
  "rounded-none bg-white shadow-none border border-[#666666] px-3 py-3 h-12  shadow-none";
const figma_input_text_class =
  "text-link text-[#989898] placeholder:text-[#989898] shadow-none";

export default function LoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only allow same-origin paths — "//evil.com" and "/\evil.com" are treated
  // as protocol-relative URLs by browsers and would redirect off-site.
  // FR-AUTH-01: with no originating page (login opened directly), the default
  // destination is the My Account dashboard, not the home page.
  const rawRedirect = searchParams.get("redirect") || "/my-account";
  const redirectTo =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\")
      ? rawRedirect
      : "/my-account";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const { ok, data } = await login_user({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });

      if (!ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      const user_name =
        data.user?.first_name?.trim() ||
        data.user?.display_name?.trim() ||
        "there";

      notifySuccess(`Welcome back, ${user_name}!`);
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed.";
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white w-full px-[50px] py-[55px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <h2 className="mb-6 text-center font-sans text-h2 font-bold uppercase text-blue">
        Login
      </h2>

      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="email"
              placeholder="Email"
              autoComplete="email"
              size="sm"
              isInvalid={Boolean(errors.email)}
              hint={errors.email?.message}
             className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figma_input_wrapper_class}
              inputClassName={figma_input_text_class}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              size="sm"
              isInvalid={Boolean(errors.password)}
              hint={errors.password?.message}
              className="w-full"
              wrapperClassName={figma_input_wrapper_class}
              inputClassName={figma_input_text_class}
            />
          )}
        />

        <div className="flex items-center justify-between">
          <Controller
            name="remember"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <label className="flex gap-2 text-link font-medium text-blue transition-colors hover:text-navy">
                <input
                  {...field}
                  type="checkbox"
                  checked={value}
                  onChange={(event) => onChange(event.target.checked)}
                  className="h-4 w-4 accent-blue"
                />
                Remember me
              </label>
            )}
          />

          <Link
            href={PUBLIC_ROUTES.forgotPassword}
            className="text-link font-medium text-blue transition-colors hover:text-navy"
          >
            Forgot password?
          </Link>
        </div>

        <div className="flex justify-center">
        <LoginButton
            type="submit"
            disabled={isSubmitting}
            className="min-w-[167px] h-[47px] rounded-none bg-amber px-8 py-3.5 font-condensed text-[18px] font-bold uppercase text-white hover:bg-[#b38600]"
            iconTrailing={FaChevronRight}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </LoginButton>
        </div>
      </form>
    </div>
  );
}
