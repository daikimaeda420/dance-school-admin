import { headers } from "next/headers";

/**
 * サーバーコンポーネントから同一アプリの認証済みAPIを呼ぶ。
 * Cookieを引き継ぐことで、ブラウザ側のuseEffectを待たずに初期表示用データを取得する。
 */
export async function fetchInternalJson<T>(path: string): Promise<T | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return null;

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie");
  const response = await fetch(`${protocol}://${host}${path}`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}
