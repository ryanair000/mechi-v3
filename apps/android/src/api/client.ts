import Constants from 'expo-constants';
import { getStoredToken } from '../lib/token-store';
import type { ApiErrorBody } from '../types';

const EMULATOR_API_URL = 'http://10.0.2.2:3000';
const PRODUCTION_API_URL = 'https://mechi.club';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
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
  if (fromConfig && (__DEV__ || fromConfig !== EMULATOR_API_URL)) {
    return fromConfig;
  }

  return __DEV__ ? EMULATOR_API_URL : PRODUCTION_API_URL;
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

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body,
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
}
