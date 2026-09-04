import type { SessionUser } from '@/domain/models';

import {
  ApiError,
  advanceAuthGeneration,
  apiRequest,
  initializeCsrfCookie,
} from './client';

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  name: string;
  password_confirmation: string;
};

export async function login(input: LoginInput): Promise<SessionUser> {
  advanceAuthGeneration();
  try {
    await initializeCsrfCookie();
    return await apiRequest<SessionUser>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } finally {
    advanceAuthGeneration();
  }
}

export async function register(input: RegisterInput): Promise<SessionUser> {
  advanceAuthGeneration();
  try {
    await initializeCsrfCookie();
    return await apiRequest<SessionUser>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } finally {
    advanceAuthGeneration();
  }
}

export async function logout(): Promise<void> {
  advanceAuthGeneration();
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  } catch (error) {
    // An expired server session is already logged out.
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  } finally {
    advanceAuthGeneration();
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiRequest<SessionUser>('/auth/me', {
      notifyUnauthorized: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
