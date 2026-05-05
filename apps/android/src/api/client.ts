import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getStoredToken } from '../lib/token-store';
import type { ApiErrorBody } from '../types';

const USB_REVERSED_API_URL = 'http://127.0.0.1:3000';
const LOCAL_WEB_API_URL = 'http://localhost:3000';
const PRODUCTION_API_URL = 'https://mechi.club';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function readConfiguredApiUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

export function getApiBaseUrl(): string {
  const fromEnv = readConfiguredApiUrl(process.env.EXPO_PUBLIC_MECHI_API_URL);
  if (fromEnv) {
    return fromEnv;
  }

  const fromConfig = readConfiguredApiUrl(Constants.expoConfig?.extra?.apiUrl);
  if (fromConfig) {
    return fromConfig;
  }

  if (__DEV__) {
    return Platform.OS === 'web' ? LOCAL_WEB_API_URL : USB_REVERSED_API_URL;
  }

  return PRODUCTION_API_URL;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function parseJson(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body ? 'POST' : 'GET');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };
  let body: BodyInit | undefined;

  if (options.auth !== false) {
    const token = await getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (options.body !== undefined) {
    if (isFormData(options.body)) {
      body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const rawText = await response.text();
    const parsed = parseJson(rawText);

    if (!response.ok) {
      const apiBody = parsed && typeof parsed === 'object' ? (parsed as ApiErrorBody) : null;
      const message =
        apiBody?.error ??
        apiBody?.message ??
        (typeof parsed === 'string' ? parsed : `Request failed with ${response.status}`);
      throw new ApiError(message, response.status, apiBody);
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Check the USB backend connection.', 0, null);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
