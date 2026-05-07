export async function requestJson<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;

  if (init && "json" in init) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { error?: string }) : (null as T);

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? "Request failed");
  }

  return payload;
}

function escapeCsvValue(value: unknown) {
  const normalized = value == null ? "" : String(value);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
) {
  if (rows.length === 0 || typeof window === "undefined") {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
