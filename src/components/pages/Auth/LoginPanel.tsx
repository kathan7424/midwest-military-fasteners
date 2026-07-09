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

import { Button } from "@/components/base/buttons/button";
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
  "rounded-none bg-white shadow-none ring-[#bdbdbd] focus-within:ring-blue";
const figma_input_text_class =
  "text-sm text-near-black placeholder:text-[#b0b0b0]";

export default function LoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect") || "/";

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
      router.push(redirectTo.startsWith("/") ? redirectTo : "/");
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
    <div className="bg-white px-8 py-10 shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
      <h2 className="mb-8 text-center font-condensed text-[28px] font-bold uppercase tracking-wide text-blue">
        Login
      </h2>

      <form
        className="flex flex-col gap-3"
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
              className="w-full"
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-near-black">
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
            className="text-sm font-medium text-blue transition-colors hover:text-navy"
          >
            Forgot password?
          </Link>
        </div>

        <div className="flex justify-center pt-3">
          <Button
            type="submit"
            color="primary"
            size="md"
            isDisabled={isSubmitting}
            className="min-w-[142px] rounded-none bg-amber px-7 py-3 font-condensed text-base font-bold uppercase tracking-wide text-white shadow-none before:rounded-none hover:bg-[#b38600]"
            iconTrailing={FaChevronRight}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </div>
      </form>
    </div>
  );
}
