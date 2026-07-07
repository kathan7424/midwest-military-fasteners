/**
 * File Name: auth.types.ts
 * Description: Authentication API types.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: AuthUser;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  expiry_date?: string;
  certificate?: File | null;
}

export interface RegisterResponse {
  success: boolean;
  entry_id?: number | null;
  message: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface AuthErrorResponse {
  code?: string;
  message?: string;
}
