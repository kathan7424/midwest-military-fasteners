/**
 * File Name: LoginPanel.tsx
 * Description: Login form panel.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaChevronRight } from "react-icons/fa6";
import toast from "react-hot-toast";

import AuthField from "@/components/pages/Auth/AuthField";
import {
  authInputClass,
  authSubmitClass,
} from "@/components/pages/Auth/auth-classes";
import { AuthErrorResponse, LoginResponse } from "@/types/auth.types";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          remember: true,
        }),
      });

      const data = (await response.json()) as LoginResponse & AuthErrorResponse;

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      toast.success("Welcome back!");
      router.push(redirectTo.startsWith("/") ? redirectTo : "/");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded bg-white p-8 shadow-md lg:p-10">
      <h2 className="mb-8 text-center text-2xl font-extrabold uppercase tracking-wide text-blue">
        Login
      </h2>

      <form
        className="flex flex-col gap-2"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <AuthField
          label="Email"
          htmlFor="login_email"
          required
          error={errors.email?.message}
        >
          <input
            id="login_email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            className={authInputClass(Boolean(errors.email))}
            {...register("email")}
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="login_password"
          required
          error={errors.password?.message}
          className="mt-3"
        >
          <input
            id="login_password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className={authInputClass(Boolean(errors.password))}
            {...register("password")}
          />
        </AuthField>

        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className={authSubmitClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? "LOGGING IN..." : "LOGIN"}
            <FaChevronRight aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
