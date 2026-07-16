"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaChevronRight } from "react-icons/fa6";

import { Input } from "@/components/base/input/input";
import LoginButton from "@/components/pages/Auth/LoginButton";

const figmaInputWrapperClass =
  "rounded-none bg-white shadow-none border border-[#666666] px-3 py-3 h-12 ring-0 focus-within:ring-0 focus-within:ring-transparent focus-within:outline-none shadow-none";
const figmaInputTextClass =
  "text-link text-[#989898] placeholder:text-[#989898] focus:outline-none ring-0 focus:ring-0 shadow-none";

const contactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  company: z.string().trim().optional(),
  email: z.string().trim().min(1, "Email is required.").email("Please enter a valid email address."),
  message: z.string().trim().min(1, "Please enter a message."),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactForm() {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setServerError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { confirmation?: string };
      setConfirmation(data.confirmation || "Thanks for contacting us! We will get in touch with you shortly.");
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    }
  };

  if (confirmation !== null) {
    return (
      <div className="rounded-[1.5rem] bg-slate-100 p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{confirmation}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-[720px] space-y-[20px]"
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
              size="sm"
              isInvalid={Boolean(errors.first_name)}
              hint={errors.first_name?.message}
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figmaInputWrapperClass}
              inputClassName={figmaInputTextClass}
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
              size="sm"
              isInvalid={Boolean(errors.last_name)}
              hint={errors.last_name?.message}
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figmaInputWrapperClass}
              inputClassName={figmaInputTextClass}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Controller
          name="company"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Company"
              size="sm"
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figmaInputWrapperClass}
              inputClassName={figmaInputTextClass}
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
              size="sm"
              isInvalid={Boolean(errors.email)}
              hint={errors.email?.message}
              className="w-full focus:outline-none ring-0 focus:ring-0 shadow-none"
              wrapperClassName={figmaInputWrapperClass}
              inputClassName={figmaInputTextClass}
            />
          )}
        />
      </div>

      <label className="sr-only" htmlFor="message">
        Questions / Comments?
      </label>
      <div className="mb-0 rounded-none bg-white shadow-none border border-[#666666] px-4 py-3 ring-0 focus-within:ring-0 focus-within:ring-transparent focus-within:outline-none">
        <textarea
          id="message"
          {...control.register("message")}
          placeholder="Questions / Comments?"
          className="w-full min-h-[130px] resize-none bg-transparent text-link text-[#989898] placeholder:text-[#989898] focus:outline-none focus:ring-0"
        />
      </div>
      {errors.message ? (
        <p className="mt-1.5 text-sm text-error-primary">{errors.message.message}</p>
      ) : null}

      {serverError ? (
        <p role="alert" className="mt-1.5 text-sm text-error-primary">
          {serverError}
        </p>
      ) : null}

      <div className="flex justify-center mt-6">
        <LoginButton
          type="submit"
          disabled={isSubmitting}
          className="min-w-[167px] h-[47px] rounded-none bg-amber px-8 py-3.5 font-condensed text-[18px] font-bold uppercase text-white hover:bg-[#b38600] disabled:opacity-60 disabled:cursor-not-allowed"
          iconTrailing={FaChevronRight}
        >
          {isSubmitting ? "Sending…" : "SUBMIT"}
        </LoginButton>
      </div>
    </form>
  );
}
