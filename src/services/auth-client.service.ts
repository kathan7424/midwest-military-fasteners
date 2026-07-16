/**
 * File Name: auth-client.service.ts
 * Description: Client-side auth API service wrappers.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-15
 */

import { apiGet, apiPost } from "@/utils/api-client";
import type { ApiResult } from "@/utils/api-client";
import { API_ROUTES } from "@/config/routes";
import {
  AuthErrorResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  RegisterMetaResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "@/types/auth.types";

export type { ApiResult as ClientApiResponse };

export async function login_user(
  payload: LoginPayload
): Promise<ApiResult<LoginResponse & AuthErrorResponse>> {
  // retries: 0 — never retry auth; a second attempt would re-lock accounts on bad credentials
  return apiPost<LoginResponse & AuthErrorResponse>(
    API_ROUTES.auth.login,
    payload,
    { retries: 0 }
  );
}

export async function register_user(
  payload: RegisterPayload
): Promise<ApiResult<RegisterResponse & AuthErrorResponse>> {
  // Multipart (certificate upload) — cannot use apiPost.
  const form_data = new FormData();
  form_data.append("first_name", payload.first_name);
  form_data.append("last_name", payload.last_name);
  form_data.append("email", payload.email);
  form_data.append("password", payload.password);
  form_data.append("confirm_password", payload.confirm_password);

  if (payload.company) {
    form_data.append("company", payload.company);
  }
  if (payload.expiry_date) {
    form_data.append("expiry_date", payload.expiry_date);
  }
  if (payload.certificate) {
    form_data.append("certificate", payload.certificate);
  }

  try {
    const response = await fetch(API_ROUTES.auth.register, {
      method: "POST",
      body: form_data,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data: data as RegisterResponse & AuthErrorResponse };
  } catch {
    return { ok: false, status: 0, data: { message: "Network error." } as RegisterResponse & AuthErrorResponse };
  }
}

export async function logout_user(): Promise<{ ok: boolean }> {
  return apiPost<unknown>(API_ROUTES.auth.logout, {}, { retries: 0 });
}

export async function forgot_password_request(
  payload: ForgotPasswordPayload
): Promise<ApiResult<ForgotPasswordResponse & AuthErrorResponse>> {
  return apiPost<ForgotPasswordResponse & AuthErrorResponse>(
    API_ROUTES.auth.forgotPassword,
    payload,
    { retries: 0 }
  );
}

export async function reset_password_request(
  payload: ResetPasswordPayload
): Promise<ApiResult<ResetPasswordResponse & AuthErrorResponse>> {
  return apiPost<ResetPasswordResponse & AuthErrorResponse>(
    API_ROUTES.auth.resetPassword,
    payload,
    { retries: 0 }
  );
}

export async function fetch_register_meta(): Promise<RegisterMetaResponse> {
  const { ok, data } = await apiGet<RegisterMetaResponse>(
    API_ROUTES.auth.register,
    { retries: 2, headers: { Accept: "application/json" } }
  );
  return ok ? data : ({} as RegisterMetaResponse);
}
