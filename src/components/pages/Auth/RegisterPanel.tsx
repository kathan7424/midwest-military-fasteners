/**
 * File Name: RegisterPanel.tsx
 * Description: Registration form panel.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaChevronRight, FaFileArrowUp } from "react-icons/fa6";
import toast from "react-hot-toast";

import AuthField from "@/components/pages/Auth/AuthField";
import {
  authDateInputClass,
  authInputClass,
  authSubmitClass,
  authUploadBtnClass,
} from "@/components/pages/Auth/auth-classes";
import { AuthErrorResponse, RegisterResponse } from "@/types/auth.types";

const registerSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, "First name is required."),
    last_name: z
      .string()
      .trim()
      .min(1, "Last name is required."),
    company: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirm_password: z
      .string()
      .min(1, "Please confirm your password."),
    expiry_date: z
      .string()
      .optional()
      .refine(
        (value) => !value || !Number.isNaN(Date.parse(value)),
        "Please enter a valid expiration date."
      ),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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
      const formData = new FormData();
      formData.append("first_name", values.first_name);
      formData.append("last_name", values.last_name);
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("confirm_password", values.confirm_password);

      if (values.company) {
        formData.append("company", values.company);
      }

      if (values.expiry_date) {
        formData.append("expiry_date", values.expiry_date);
      }

      if (certificate) {
        formData.append("certificate", certificate);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as RegisterResponse & AuthErrorResponse;

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      toast.success(
        data.message || "Registration successful. You can now log in."
      );
      reset();
      setCertificate(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.push("/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCertificate(event.target.files?.[0] ?? null);
  };

  return (
    <div>
      <h2 className="mb-8 text-center text-2xl font-extrabold uppercase tracking-wide text-blue">
        Create Your Account
      </h2>

      <form
        className="flex flex-col gap-2"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 md:items-start">
          <AuthField
            label="First Name"
            htmlFor="first_name"
            required
            error={errors.first_name?.message}
          >
            <input
              id="first_name"
              type="text"
              placeholder="First Name"
              autoComplete="given-name"
              className={authInputClass(Boolean(errors.first_name))}
              {...register("first_name")}
            />
          </AuthField>

          <AuthField
            label="Last Name"
            htmlFor="last_name"
            required
            error={errors.last_name?.message}
          >
            <input
              id="last_name"
              type="text"
              placeholder="Last Name"
              autoComplete="family-name"
              className={authInputClass(Boolean(errors.last_name))}
              {...register("last_name")}
            />
          </AuthField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 md:items-start">
          <AuthField label="Company" htmlFor="company">
            <input
              id="company"
              type="text"
              placeholder="Company"
              autoComplete="organization"
              className={authInputClass()}
              {...register("company")}
            />
          </AuthField>

          <AuthField
            label="Email"
            htmlFor="register_email"
            required
            error={errors.email?.message}
          >
            <input
              id="register_email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              className={authInputClass(Boolean(errors.email))}
              {...register("email")}
            />
          </AuthField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 md:items-start">
          <AuthField
            label="Password"
            htmlFor="register_password"
            required
            error={errors.password?.message}
          >
            <input
              id="register_password"
              type="password"
              placeholder="Enter Password"
              autoComplete="new-password"
              className={authInputClass(Boolean(errors.password))}
              {...register("password")}
            />
          </AuthField>

          <AuthField
            label="Confirm Password"
            htmlFor="confirm_password"
            required
            error={errors.confirm_password?.message}
          >
            <input
              id="confirm_password"
              type="password"
              placeholder="Confirm Password"
              autoComplete="new-password"
              className={authInputClass(Boolean(errors.confirm_password))}
              {...register("confirm_password")}
            />
          </AuthField>
        </div>

        <AuthField
          label="Sales Tax Exemption Doc"
          htmlFor="certificate_display"
          className="mt-4"
        >
          <div className="flex h-12 overflow-hidden rounded border border-light-gray">
            <input
              id="certificate_display"
              type="text"
              readOnly
              value={certificate?.name || ""}
              placeholder="Upload Sales Tax Exemption Doc"
              className="min-w-0 flex-1 border-0 bg-white px-4 text-base text-near-black placeholder:text-mid-gray focus:outline-none"
            />
            <input
              ref={fileInputRef}
              id="certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className={authUploadBtnClass}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaFileArrowUp aria-hidden="true" />
              UPLOAD
            </button>
          </div>
        </AuthField>

        <AuthField
          label="Expiration Date"
          htmlFor="expiry_date"
          className="mt-4 md:max-w-[320px]"
          error={errors.expiry_date?.message}
        >
          <input
            id="expiry_date"
            type="date"
            className={authDateInputClass(Boolean(errors.expiry_date))}
            {...register("expiry_date")}
          />
        </AuthField>

        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className={authSubmitClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? "REGISTERING..." : "REGISTER"}
            <FaChevronRight aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
