/**
 * File Name: auth-client.service.ts
 * Description: Client-side auth API service wrappers.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

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
} from "@/types/auth.types";

export interface ClientApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function parse_api_response<T>(response: Response): Promise<ClientApiResponse<T>> {
  return {
    ok: response.ok,
    status: response.status,
    data: (await response.json()) as T,
  };
}

export async function login_user(
  payload: LoginPayload
): Promise<ClientApiResponse<LoginResponse & AuthErrorResponse>> {
  const response = await fetch(API_ROUTES.auth.login, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parse_api_response<LoginResponse & AuthErrorResponse>(response);
}

export async function register_user(
  payload: RegisterPayload
): Promise<ClientApiResponse<RegisterResponse & AuthErrorResponse>> {
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

  const response = await fetch(API_ROUTES.auth.register, {
    method: "POST",
    body: form_data,
  });

  return parse_api_response<RegisterResponse & AuthErrorResponse>(response);
}

export async function logout_user(): Promise<Response> {
  return fetch(API_ROUTES.auth.logout, {
    method: "POST",
  });
}

export async function forgot_password_request(
  payload: ForgotPasswordPayload
): Promise<ClientApiResponse<ForgotPasswordResponse & AuthErrorResponse>> {
  const response = await fetch(API_ROUTES.auth.forgotPassword, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parse_api_response<ForgotPasswordResponse & AuthErrorResponse>(response);
}

export async function fetch_register_meta(): Promise<RegisterMetaResponse> {
  const response = await fetch(API_ROUTES.auth.register, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return (await response.json()) as RegisterMetaResponse;
}
