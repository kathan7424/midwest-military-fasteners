import { ENV } from "@/config/env";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  company: z.string().trim().optional(),
  email: z.string().trim().email(),
  message: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed." }, { status: 400 });
  }

  const { first_name, last_name, company, email, message } = parsed.data;

  try {
    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/contact`,
      {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ first_name, last_name, company: company ?? "", email, message }),
      }
    );

    if (!wpResponse.ok) {
      const err = (await wpResponse.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { message: err.message ?? "Form submission failed. Please try again." },
        { status: wpResponse.status >= 500 ? 502 : wpResponse.status }
      );
    }

    const data = (await wpResponse.json().catch(() => ({}))) as {
      success?: boolean;
      confirmation?: string;
    };

    return NextResponse.json({
      success: true,
      confirmation: data.confirmation ?? "",
    });
  } catch {
    return NextResponse.json({ message: "Service unavailable. Please try again later." }, { status: 503 });
  }
}
