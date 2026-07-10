"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { FaChevronRight } from "react-icons/fa6";
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
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
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

  const onSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div className="w-full">
      {submitted ? (
        <div className="rounded-[1.5rem] bg-slate-100 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Thanks — your message was received.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-[720px] space-y-[20px]">
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
          {errors.message ? <p className="text-xs text-error-primary">{errors.message.message}</p> : null}

          <div className="flex justify-center mt-6">
             <LoginButton
                type="submit"
                className="min-w-[167px] h-[47px] rounded-none bg-amber px-8 py-3.5 font-condensed text-[18px] font-bold uppercase text-white hover:bg-[#b38600]"
                iconTrailing={FaChevronRight}>
                SUBMIT
            </LoginButton>
          </div>
        </form>
      )}
    </div>
  );
}
