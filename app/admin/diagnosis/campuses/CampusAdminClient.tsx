// app/admin/diagnosis/campuses/CampusAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Campus = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isOnline: boolean;
  isActive: boolean;
  address?: string | null;
  access?: string | null;
  googleMapUrl?: string | null;
};

type Props = {
  schoolId: string;
};

type PatchableField = keyof Pick<
  Campus,
  | "label"
  | "slug"
  | "sortOrder"
  | "isOnline"
  | "isActive"
  | "address"
  | "access"
  | "googleMapUrl"
>;

const inputBase =
  "rounded border px-2 py-1 text-sm text-gray-900 bg-white border-gray-300 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500";

const cellInputBase =
  "w-full rounded border px-1 py-0.5 text-gray-900 bg-white border-gray-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 " +
  "dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700";

const cellTextareaBase =
  "w-full rounded border px-1 py-0.5 text-gray-900 bg-white border-gray-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 " +
  "dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700";

export default function CampusAdminClient({ schoolId }: Props) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規追加用フォーム
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(0);
  const [newIsOnline, setNewIsOnline] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true); // ✅ 追加：有効/無効
  const [newAddress, setNewAddress] = useState("");
  const [newAccess, setNewAccess] = useState("");
  const [newGoogleMapUrl, setNewGoogleMapUrl] = useState("");

  const disabled = !schoolId;

  // schoolId切替時に古い fetch が勝って上書きするのを防ぐ
  const abortRef = useRef<AbortController | null>(null);

  const apiBase = useMemo(() => {
    // ✅ full=1 を付ける（無効も含めた管理画面表示。未対応でも無視されるので安全）
    return `/api/admin/diagnosis/campuses?schoolId=${encodeURIComponent(
      schoolId
    )}&full=1`;
  }, [schoolId]);

  const fetchCampuses = async () => {
    if (!schoolId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiBase, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        setError("校舎一覧の取得に失敗しました。");
        return;
      }

      const data = (await res.json()) as Campus[];
      setCampuses(data);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) {
      setCampuses([]);
      setError(null);
      return;
    }
    fetchCampuses();

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleCreate = async () => {
    if (!schoolId) return;

    const label = newLabel.trim();
    const slug = newSlug.trim();
    const address = newAddress.trim();
    const access = newAccess.trim();
    const googleMapUrl = newGoogleMapUrl.trim();

    if (!label || !slug) {
      setError("校舎名とスラッグは必須です。");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/diagnosis/campuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          schoolId,
          label,
          slug,
          sortOrder: newSortOrder,
          isOnline: newIsOnline,
          isActive: newIsActive, // ✅ 追加：作成時に有効/無効を指定
          address: address || null,
          access: access || null,
          googleMapUrl: googleMapUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "校舎の作成に失敗しました。");
        return;
      }

      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(0);
      setNewIsOnline(false);
      setNewIsActive(true); // ✅
      setNewAddress("");
      setNewAccess("");
      setNewGoogleMapUrl("");

      await fetchCampuses();
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (
    id: string,
    field: PatchableField,
    value: string | number | boolean | null
  ) => {
    if (saving) return;

    const current = campuses.find((c) => c.id === id);
    if (current && (current as any)[field] === value) return;

    // optimistic update
    setCampuses((prev) =>
      prev.map((c) => (c.id === id ? ({ ...c, [field]: value } as Campus) : c))
    );

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/diagnosis/campuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        // ✅ backend側で schoolId を必須にしている場合に備えて必ず送る
        body: JSON.stringify({ schoolId, [field]: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "更新に失敗しました。");
        await fetchCampuses();
        return;
      }

      await fetchCampuses();
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
      await fetchCampuses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (saving) return;
    if (!window.confirm("この校舎を削除しますか？")) return;

    setSaving(true);
    setError(null);

    const snapshot = campuses;
    setCampuses((prev) => prev.filter((c) => c.id !== id));

    try {
      // ✅ schoolId を query に付与（誤削除防止 / backend必須のケースに対応）
      const res = await fetch(
        `/api/admin/diagnosis/campuses/${id}?schoolId=${encodeURIComponent(
          schoolId
        )}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "削除に失敗しました。");
        setCampuses(snapshot);
        return;
      }
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
      setCampuses(snapshot);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 新規追加フォーム */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          新しい校舎を追加
        </h2>

        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              校舎名（label）
            </label>
            <input
              className={inputBase}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={disabled || saving}
              placeholder="例：渋谷校"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              スラッグ（slug）※Q1のID
            </label>
            <input
              className={inputBase}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="shibuya など"
              disabled={disabled || saving}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              表示順（sortOrder）
            </label>
            <input
              type="number"
              className={inputBase}
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(Number(e.target.value) || 0)}
              disabled={disabled || saving}
            />
          </div>

          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newIsOnline}
                onChange={(e) => setNewIsOnline(e.target.checked)}
                disabled={disabled || saving}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              オンライン校舎（【オンライン】自宅で受講）
            </label>

            {/* ✅ 追加：有効/無効 */}
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                disabled={disabled || saving}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              有効にする
            </label>
          </div>
        </div>

        {/* ✅ 追加フィールド */}
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              住所
            </label>
            <input
              className={inputBase}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              disabled={disabled || saving}
              placeholder="例：東京都渋谷区〇〇1-2-3"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              アクセス
            </label>
            <textarea
              className={inputBase + " min-h-[38px]"}
              value={newAccess}
              onChange={(e) => setNewAccess(e.target.value)}
              disabled={disabled || saving}
              placeholder="例：渋谷駅ハチ公口より徒歩5分"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Google Map URL
            </label>
            <input
              className={inputBase}
              value={newGoogleMapUrl}
              onChange={(e) => setNewGoogleMapUrl(e.target.value)}
              disabled={disabled || saving}
              placeholder="共有リンク（maps.app.goo.gl/...）or 埋め込みURL"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={disabled || saving}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white
                     hover:bg-blue-700 disabled:opacity-40
                     dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          {saving ? "保存中..." : "校舎を追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            校舎一覧
          </h2>

          <div className="flex items-center gap-3">
            {loading && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                読み込み中...
              </span>
            )}
            <button
              type="button"
              onClick={fetchCampuses}
              disabled={disabled || loading || saving}
              className="text-[11px] underline text-gray-600 hover:text-gray-800 disabled:opacity-40
                         dark:text-gray-300 dark:hover:text-gray-100"
            >
              再読み込み
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mb-3 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700
                          dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {campuses.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            登録されている校舎はありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* ✅ 列が増えるので幅を広げる */}
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead>
                <tr
                  className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-600
                               dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                >
                  <th className="px-2 py-1">校舎名</th>
                  <th className="px-2 py-1">slug</th>
                  <th className="px-2 py-1">sort</th>
                  <th className="px-2 py-1">住所</th>
                  <th className="px-2 py-1">アクセス</th>
                  <th className="px-2 py-1">GoogleMap</th>
                  <th className="px-2 py-1">オンライン</th>
                  <th className="px-2 py-1">有効</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>

              <tbody>
                {campuses.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 last:border-none hover:bg-gray-50
                               dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-2 py-1">
                      <input
                        className={cellInputBase}
                        defaultValue={c.label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== c.label)
                            handleUpdateField(c.id, "label", v);
                        }}
                        disabled={saving}
                      />
                    </td>

                    <td className="px-2 py-1">
                      <input
                        className={cellInputBase}
                        defaultValue={c.slug}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== c.slug) handleUpdateField(c.id, "slug", v);
                        }}
                        disabled={saving}
                      />
                    </td>

                    <td className="px-2 py-1">
                      <input
                        type="number"
                        className={
                          "w-20 " + cellInputBase.replace("w-full ", "").trim()
                        }
                        defaultValue={c.sortOrder}
                        onBlur={(e) => {
                          const v = Number(e.target.value) || 0;
                          if (v !== c.sortOrder)
                            handleUpdateField(c.id, "sortOrder", v);
                        }}
                        disabled={saving}
                      />
                    </td>

                    {/* ✅ 住所 */}
                    <td className="px-2 py-1">
                      <input
                        className={cellInputBase}
                        defaultValue={c.address ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const next = v ? v : null;
                          if ((c.address ?? null) !== next)
                            handleUpdateField(c.id, "address", next);
                        }}
                        disabled={saving}
                        placeholder="住所"
                      />
                    </td>

                    {/* ✅ アクセス（複数行） */}
                    <td className="px-2 py-1">
                      <textarea
                        className={cellTextareaBase + " min-h-[34px]"}
                        defaultValue={c.access ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const next = v ? v : null;
                          if ((c.access ?? null) !== next)
                            handleUpdateField(c.id, "access", next);
                        }}
                        disabled={saving}
                        placeholder="アクセス"
                      />
                    </td>

                    {/* ✅ GoogleMap URL */}
                    <td className="px-2 py-1">
                      <input
                        className={cellInputBase}
                        defaultValue={c.googleMapUrl ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const next = v ? v : null;
                          if ((c.googleMapUrl ?? null) !== next)
                            handleUpdateField(c.id, "googleMapUrl", next);
                        }}
                        disabled={saving}
                        placeholder="URL"
                      />
                      {c.googleMapUrl ? (
                        <div className="mt-1">
                          <a
                            href={c.googleMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] underline text-blue-600 hover:text-blue-700
                                       dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            開く
                          </a>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={c.isOnline}
                        onChange={(e) =>
                          handleUpdateField(c.id, "isOnline", e.target.checked)
                        }
                        disabled={saving}
                        className="rounded border-gray-300 dark:border-gray-700"
                      />
                    </td>

                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={c.isActive}
                        onChange={(e) =>
                          handleUpdateField(c.id, "isActive", e.target.checked)
                        }
                        disabled={saving}
                        className="rounded border-gray-300 dark:border-gray-700"
                      />
                    </td>

                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-[11px] text-red-600 underline hover:text-red-700 disabled:opacity-40
                                   dark:text-red-300 dark:hover:text-red-200"
                        disabled={saving}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {saving && (
              <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                保存中...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
