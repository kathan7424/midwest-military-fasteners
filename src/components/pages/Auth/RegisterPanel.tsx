/**
 * File Name: RegisterPanel.tsx
 * Description: Registration form panel (Untitled UI).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-10
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { FaChevronRight } from "react-icons/fa6";
import { z } from "zod";

import { parseDate } from "@internationalized/date";

import { register_user } from "@/services/auth-client.service";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import LoginButton from "@/components/pages/Auth/LoginButton";
import { Input } from "@/components/base/input/input";
import SalesTaxExemptionUpload from "@/components/pages/Auth/SalesTaxExemptionUpload";
import { notifyError, notifySuccess } from "@/utils/notifications";

// Expiry is required whenever a certificate is uploaded (WC tax exemption
// rule: an approved cert without an expiry can never be validated), so the
// schema is built per-render with the current certificate state.
function buildRegisterSchema(hasCertificate: boolean) {
  return z
    .object({
      first_name: z.string().trim().min(1, "First name is required."),
      last_name: z.string().trim().min(1, "Last name is required."),
      company: z.string().trim().optional(),
      email: z
        .string()
        .trim()
        .min(1, "Email is required.")
        .email("Please enter a valid email address."),
      password: z.string().min(8, "Password must be at least 8 characters."),
      confirm_password: z.string().min(1, "Please confirm your password."),
      expiry_date: z
        .string()
        .optional()
        .refine(
          (value) => !hasCertificate || Boolean(value),
          "Expiration date is required when uploading a certificate."
        )
        .refine(
          (value) => !value || !Number.isNaN(Date.parse(value)),
          "Please enter a valid expiration date."
        )
        .refine(
          (value) => {
            if (!value) return true;
            const picked = new Date(`${value}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return picked >= today;
          },
          "Expiration date must be today or a future date."
        ),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: "Passwords do not match.",
      path: ["confirm_password"],
    })
    .refine(
      (data) => data.password.toLowerCase() !== data.email.trim().toLowerCase(),
      {
        message: "Password cannot be the same as your email address.",
        path: ["password"],
      }
    );
}

type RegisterFormValues = z.infer<ReturnType<typeof buildRegisterSchema>>;

interface RegisterPanelProps {
  title?: string;
}

const figma_input_wrapper_class =
  "rounded-none bg-white shadow-none border border-[#666666] px-3 py-3 h-12 shadow-none";
const figma_input_text_class =
  "text-link text-[#989898] placeholder:text-[#989898] shadow-none";

export default function RegisterPanel({
  title = "Create Your Account",
}: RegisterPanelProps) {
  const router = useRouter();
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certificateError, setCertificateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(buildRegisterSchema(Boolean(certificate))),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      password: "",
      confirm_password: "",
      expiry_date: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);

    try {
      const { ok, data } = await register_user({
        first_name: values.first_name,
        last_name: values.last_name,
        company: values.company,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        expiry_date: values.expiry_date,
        certificate,
      });

      if (!ok) {
        throw new Error(data.message || "Registration failed.");
      }

      // FR-AUTH-05: registration auto-logs-in (WP login cookies are set by the
      // register API), so land the customer in their account — no manual login.
      notifySuccess(data.message || "Welcome! Your account is ready.");

      // FR-AUTH-07: a submitted certificate starts as "pending review" — say so
      // clearly at registration. Until approved, orders are charged full tax.
      if (certificate) {
        notifySuccess(
          "Your tax exemption certificate was submitted and is pending review. " +
            "Sales tax applies until it is approved."
        );
      }

      reset();
      setCertificate(null);
      setCertificateError("");
      router.push("/my-account");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed.";
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-sans text-h2 font-bold mb-6 text-center text-dark-gray">
        {title}
      </h1>

      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="First Name"
                autoComplete="given-name"
                size="sm"
                isInvalid={Boolean(errors.first_name)}
                hint={errors.first_name?.message}
                className="w-full shadow-none"
                wrapperClassName={figma_input_wrapper_class}
                inputClassName={figma_input_text_class}
              />
            )}
          />

          <Controller
            name="last_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Last Name"
                autoComplete="family-name"
                size="sm"
                isInvalid={Boolean(errors.last_name)}
                hint={errors.last_name?.message}
                className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
                wrapperClassName={figma_input_wrapper_class}
                inputClassName={figma_input_text_class}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="company"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Company"
                autoComplete="organization"
                size="sm"
                className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
                wrapperClassName={figma_input_wrapper_class}
                inputClassName={figma_input_text_class}
              />
            )}
          />

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
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="password"
                placeholder="Enter Password"
                autoComplete="new-password"
                size="sm"
                isInvalid={Boolean(errors.password)}
                hint={errors.password?.message}
                className="w-full shadow-none"
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
                placeholder="Confirm Password"
                autoComplete="new-password"
                size="sm"
                isInvalid={Boolean(errors.confirm_password)}
                hint={errors.confirm_password?.message}
                className="w-full shadow-none"
                wrapperClassName={figma_input_wrapper_class}
                inputClassName={figma_input_text_class}
              />
            )}
          />
        </div>

        <SalesTaxExemptionUpload
          file={certificate}
          error={certificateError}
          onFileChange={(file) => {
            setCertificate(file);
            setCertificateError("");
          }}
          onSizeError={() => {
            const message = "File must be 5 MB or smaller.";
            setCertificateError(message);
            notifyError(message);
          }}
          onTypeError={() => {
            const message =
              "Only PDF, JPG, JPEG, PNG, DOC, and DOCX files are allowed.";
            setCertificateError(message);
            notifyError(message);
          }}
        />

        <div className="max-w-[170px]">
          <Controller
            name="expiry_date"
            control={control}
            render={({ field }) => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const hasError = Boolean(errors.expiry_date);
              return (
                <div>
                  <DatePicker
                    value={field.value ? parseDate(field.value) : null}
                    onChange={(date) => {
                      field.onChange(date ? date.toString() : "");
                    }}
                    minValue={parseDate(todayStr)}
                    size="md"
                    placeholder="Expiration Date"
                    buttonClassName={`h-12 w-full rounded-none border bg-white px-3 text-left font-normal focus-visible:outline-offset-0 focus:ring focus-within:ring-1 shadow-none text-[16px] text-[#989898] ${hasError ? "border-red-500 focus-within:ring-red-400" : "border-[#666666] focus-within:ring-brand"}`}
                  />
                  {errors.expiry_date?.message ? (
                    <p className="mt-1 text-xs text-error-primary">
                      {errors.expiry_date.message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
        </div>

        <div className="flex justify-center pt-3 md:justify-center">
        <LoginButton
            type="submit"
            disabled={isSubmitting}
            className="min-w-[167px] h-[47px] rounded-none bg-amber px-8 py-3.5 font-condensed text-[18px] font-bold uppercase text-white hover:bg-[#b38600] focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-blue focus-visible:outline-offset-1 focus-visible:ring-0"
            iconTrailing={FaChevronRight}
          >
            {isSubmitting ? "Registering..." : "Register"}
          </LoginButton>
        </div>
      </form>
    </div>
  );
}
