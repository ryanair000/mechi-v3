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
  const code = dbError.code ?? '';

  const normalizedMessage = message.toLowerCase();
  const columnParts = column ? column.split('.') : [];
  const tableName = columnParts.length > 1 ? columnParts[0] : null;
  const columnName = columnParts.length > 1 ? columnParts[1] : columnParts[0] ?? null;

  const matchesColumnName = !columnName
    ? false
    : message.includes(columnName) ||
      message.includes(`'${columnName}'`) ||
      normalizedMessage.includes(columnName.toLowerCase());

  const matchesTableName = !tableName
    ? true
    : message.includes(tableName) ||
      message.includes(`'${tableName}'`) ||
      normalizedMessage.includes(tableName.toLowerCase());

  return (
    (code === '42703' || code === 'PGRST204') &&
    (column
      ? message.includes(column) || (matchesColumnName && matchesTableName)
      : normalizedMessage.includes('does not exist') ||
        normalizedMessage.includes('could not find the') ||
        normalizedMessage.includes('schema cache'))
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
