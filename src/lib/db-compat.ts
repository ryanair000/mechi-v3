type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function normalizeEnvValue(value: string | null | undefined): string {
  return (value ?? '').replace(/\\n/g, '').trim();
}

export function isMissingColumnError(error: unknown, column?: string): boolean {
  const dbError = (error ?? {}) as DatabaseErrorLike;
  const message = dbError.message ?? '';

  return (
    dbError.code === '42703' &&
    (column ? message.includes(column) : message.toLowerCase().includes('does not exist'))
  );
}

export function isMissingTableError(error: unknown, table?: string): boolean {
  const dbError = (error ?? {}) as DatabaseErrorLike;
  const message = dbError.message ?? '';

  return (
    dbError.code === 'PGRST205' &&
    (table ? message.includes(`'public.${table}'`) || message.includes(table) : true)
  );
}
