/**
 * File Name: ForgotPasswordPanel.tsx
 * Description: Forgot password request form.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { FaChevronRight } from "react-icons/fa6";
import { z } from "zod";

import LoginButton from "@/components/pages/Auth/LoginButton";
import { Input } from "@/components/base/input/input";
import { forgot_password_request } from "@/services/auth-client.service";
import { notifyError, notifySuccess } from "@/utils/notifications";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const figma_input_wrapper_class =
  "rounded-none bg-white shadow-none border border-[#666666] px-3 py-3 h-12 shadow-none";
const figma_input_text_class =
  "text-link text-[#989898] placeholder:text-[#989898] shadow-none";

export default function ForgotPasswordPanel() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      const { ok, data } = await forgot_password_request({
        email: values.email,
      });

      if (!ok) {
        throw new Error(
          data.message || "Password reset instructions could not be sent."
        );
      }

      notifySuccess(
        data.message || "Password reset instructions have been sent to your email."
      );
      reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Password reset instructions could not be sent.";
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white px-8 py-10 shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
      <h1 className="mb-8 text-center font-condensed text-[28px] font-bold uppercase tracking-wide text-blue">
        Forgot Password
      </h1>

      <p className="mb-6 text-center text-sm text-dark-gray">
        Enter your email address and we&apos;ll send you password reset instructions.
      </p>

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
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </LoginButton>
        </div>
      </form>
    </div>
  );
}
