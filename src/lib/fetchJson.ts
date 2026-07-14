// Safe JSON fetch: never throws "Unexpected end of JSON input".
//
// If the server returns an empty body or non-JSON (e.g. a bare 500 from a
// crashed route), we surface a readable error instead of a cryptic parse error.
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const raw = await res.text();

  let data: unknown = undefined;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      // Non-JSON body — fall through to the error handling below.
    }
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | undefined)?.error ||
      `คำขอล้มเหลว (HTTP ${res.status})`;
    throw new Error(message);
  }

  if (data === undefined) {
    throw new Error("เซิร์ฟเวอร์ตอบกลับข้อมูลว่าง กรุณาลองใหม่อีกครั้ง");
  }

  return data as T;
}
