// app/admin/diagnosis/campuses/CampusAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Campus = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  address?: string | null;
  access?: string | null;
  googleMapUrl?: string | null;
};

type Props = { schoolId: string };

type Draft = {
  label: string;
  slug: string;
  sortOrder: number; // UIでは編集しない（並び替えで自動更新）
  isActive: boolean;
  address: string; // null -> ""
  access: string; // null -> ""
  googleMapUrl: string; // null -> ""
};

const inputBase =
  "w-full rounded-md border px-2 py-1 text-xs text-gray-900 bg-white border-gray-300 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500";

const textareaBase =
  "w-full rounded-md border px-2 py-1 text-xs text-gray-900 bg-white border-gray-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 " +
  "dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700 dark:[color-scheme:dark]";

function toDraft(c: Campus): Draft {
  return {
    label: c.label ?? "",
    slug: c.slug ?? "",
    sortOrder: Number.isFinite(c.sortOrder) ? c.sortOrder : 0,
    isActive: !!c.isActive,
    address: c.address ?? "",
    access: c.access ?? "",
    googleMapUrl: c.googleMapUrl ?? "",
  };
}

/**
 * ✅ sortOrder は「並び替え専用」なので、通常の「未保存」判定からは除外する
 * （並び替えは上部の「並び替えを保存」ボタンで保存する）
 */
function isSameDraftIgnoringOrder(d: Draft, c: Campus): boolean {
  const b = toDraft(c);
  return (
    d.label === b.label &&
    d.slug === b.slug &&
    d.isActive === b.isActive &&
    d.address === b.address &&
    d.access === b.access &&
    d.googleMapUrl === b.googleMapUrl
  );
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function CampusAdminClient({ schoolId }: Props) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ 並び替えの未保存フラグ
  const [orderDirty, setOrderDirty] = useState(false);

  // DnD 用
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // 新規追加用フォーム（表示順は入力させない）
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const [newAccess, setNewAccess] = useState("");
  const [newGoogleMapUrl, setNewGoogleMapUrl] = useState("");

  const disabled = !schoolId;
  const abortRef = useRef<AbortController | null>(null);

  // 最後に保存された並び（id配列）を保持して「未保存」を判定
  const lastSavedOrderRef = useRef<string[]>([]);

  const apiBase = useMemo(() => {
    return `/api/admin/diagnosis/campuses?schoolId=${encodeURIComponent(
      schoolId
    )}&full=1`;
  }, [schoolId]);

  const recomputeSortOrders = (list: Campus[]) => {
    // sortOrder を “表示順” に対応させる（0,10,20... で安定させる）
    return list.map((c, idx) => ({ ...c, sortOrder: idx * 10 }));
  };

  const applyOrderToState = (nextList: Campus[], markDirty: boolean) => {
    const ordered = recomputeSortOrders(nextList);

    setCampuses(ordered);

    // drafts の sortOrder も同期（ただし通常の未保存とは別扱い）
    setDrafts((prev) => {
      const next = { ...prev };
      for (const c of ordered) {
        const base = next[c.id] ?? toDraft(c);
        next[c.id] = { ...base, sortOrder: c.sortOrder };
      }
      // 存在しないidを削除
      for (const id of Object.keys(next)) {
        if (!ordered.find((x) => x.id === id)) delete next[id];
      }
      return next;
    });

    setOrderDirty(markDirty);
  };

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

      // sortOrder順に並べる（表示安定）
      const sorted = [...(Array.isArray(data) ? data : [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );

      // ✅ state へ反映（fetch直後は未保存なし）
      const normalized = recomputeSortOrders(sorted);
      setCampuses(normalized);

      setDrafts((prev) => {
        const next: Record<string, Draft> = { ...prev };
        for (const c of normalized) if (!next[c.id]) next[c.id] = toDraft(c);
        for (const id of Object.keys(next)) {
          if (!normalized.find((x) => x.id === id)) delete next[id];
        }
        // sortOrder も同期
        for (const c of normalized) {
          next[c.id] = {
            ...(next[c.id] ?? toDraft(c)),
            sortOrder: c.sortOrder,
          };
        }
        return next;
      });

      lastSavedOrderRef.current = normalized.map((c) => c.id);
      setOrderDirty(false);
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
      setDrafts({});
      setError(null);
      setOrderDirty(false);
      lastSavedOrderRef.current = [];
      return;
    }

    void fetchCampuses();

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? toDraft(campuses.find((c) => c.id === id) as any)),
        ...patch,
      },
    }));
  };

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

    // ✅ 新規は末尾に追加（現在の末尾より大きい sortOrder）
    const nextSortOrder =
      campuses.length > 0
        ? (campuses[campuses.length - 1]?.sortOrder ?? 0) + 10
        : 0;

    setSavingId("__create__");
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
          sortOrder: nextSortOrder,
          isActive: newIsActive,
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
      setNewIsActive(true);
      setNewAddress("");
      setNewAccess("");
      setNewGoogleMapUrl("");

      await fetchCampuses();
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = (id: string) => {
    const c = campuses.find((x) => x.id === id);
    if (!c) return;
    setDrafts((prev) => ({ ...prev, [id]: toDraft(c) }));
    setError(null);
  };

  const handleSave = async (id: string) => {
    if (savingId || deletingId) return;

    const c = campuses.find((x) => x.id === id);
    const d = drafts[id];
    if (!c || !d) return;

    if (isSameDraftIgnoringOrder(d, c)) return;

    const nextLabel = d.label.trim();
    const nextSlug = d.slug.trim();
    if (!nextLabel || !nextSlug) {
      setError("校舎名（label）とslugは空にできません。");
      return;
    }

    setSavingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/diagnosis/campuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          schoolId,
          label: nextLabel,
          slug: nextSlug,
          sortOrder: d.sortOrder, // ✅ 並び替えで変わっていても送る
          isActive: d.isActive,
          address: d.address.trim() ? d.address.trim() : null,
          access: d.access.trim() ? d.access.trim() : null,
          googleMapUrl: d.googleMapUrl.trim() ? d.googleMapUrl.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "更新に失敗しました。");
        return;
      }

      await fetchCampuses();
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (savingId || deletingId) return;
    if (!window.confirm("この校舎を削除しますか？")) return;

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/diagnosis/campuses/${id}?schoolId=${encodeURIComponent(
          schoolId
        )}`,
        { method: "DELETE", cache: "no-store" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "削除に失敗しました。");
        return;
      }

      await fetchCampuses();
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ 並び替え保存（全件の sortOrder を一括で PATCH）
  const handleSaveOrder = async () => {
    if (savingId || deletingId) return;
    if (!orderDirty) return;

    setSavingId("__order__");
    setError(null);

    try {
      // 現在の並びを sortOrder へ反映
      const ordered = recomputeSortOrders(campuses);

      // drafts へも同期（直近状態で送る）
      const currentDrafts = drafts;

      for (const c of ordered) {
        const d = currentDrafts[c.id] ?? toDraft(c);

        const nextLabel = d.label.trim();
        const nextSlug = d.slug.trim();
        if (!nextLabel || !nextSlug) {
          throw new Error("校舎名（label）とslugは空にできません。");
        }

        const res = await fetch(`/api/admin/diagnosis/campuses/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            schoolId,
            label: nextLabel,
            slug: nextSlug,
            sortOrder: c.sortOrder,
            isActive: d.isActive,
            address: d.address.trim() ? d.address.trim() : null,
            access: d.access.trim() ? d.access.trim() : null,
            googleMapUrl: d.googleMapUrl.trim() ? d.googleMapUrl.trim() : null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "並び替えの保存に失敗しました。");
        }
      }

      await fetchCampuses();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSavingId(null);
    }
  };

  const busy = !!savingId || !!deletingId;

  // DnD handlers
  const onDragStartRow = (id: string) => {
    if (busy) return;
    setDraggingId(id);
    setDragOverId(null);
  };

  const onDragOverRow = (id: string, e: React.DragEvent) => {
    if (busy) return;
    e.preventDefault(); // drop を許可
    if (dragOverId !== id) setDragOverId(id);
  };

  const onDropRow = (id: string, e: React.DragEvent) => {
    if (busy) return;
    e.preventDefault();

    const fromId = draggingId;
    const toId = id;

    setDraggingId(null);
    setDragOverId(null);

    if (!fromId || fromId === toId) return;

    const fromIndex = campuses.findIndex((c) => c.id === fromId);
    const toIndex = campuses.findIndex((c) => c.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = arrayMove(campuses, fromIndex, toIndex);

    // 「最後に保存された並び」と違えば dirty
    const movedIds = moved.map((c) => c.id);
    const dirtyNow =
      movedIds.length !== lastSavedOrderRef.current.length ||
      movedIds.some((x, i) => x !== lastSavedOrderRef.current[i]);

    applyOrderToState(moved, dirtyNow);
  };

  const onDragEndRow = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-4">
      {/* 新規追加フォーム */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          新しい校舎を追加
        </h2>

        <div className="grid gap-2 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              校舎名（label）
            </label>
            <input
              className={inputBase}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={disabled || savingId === "__create__"}
              placeholder="例：渋谷校"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              スラッグ（slug）※Q1のID
            </label>
            <input
              className={inputBase}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="shibuya など"
              disabled={disabled || savingId === "__create__"}
            />
          </div>

          {/* ✅ 表示順（sortOrder）はUIから削除 */}

          <div className="md:col-span-5 flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                disabled={disabled || savingId === "__create__"}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              有効にする
            </label>

            <button
              type="button"
              onClick={handleCreate}
              disabled={disabled || savingId === "__create__"}
              className="ml-auto rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white
                         hover:bg-blue-700 disabled:opacity-40
                         dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {savingId === "__create__" ? "保存中..." : "追加"}
            </button>
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              住所
            </label>
            <input
              className={inputBase}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              disabled={disabled || savingId === "__create__"}
              placeholder="例：東京都渋谷区〇〇1-2-3"
            />
          </div>

          <div className="md:col-span-5">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              アクセス
            </label>
            <textarea
              className={textareaBase + " min-h-[40px]"}
              value={newAccess}
              onChange={(e) => setNewAccess(e.target.value)}
              disabled={disabled || savingId === "__create__"}
              placeholder="例：渋谷駅ハチ公口より徒歩5分"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Google Map URL
            </label>
            <input
              className={inputBase}
              value={newGoogleMapUrl}
              onChange={(e) => setNewGoogleMapUrl(e.target.value)}
              disabled={disabled || savingId === "__create__"}
              placeholder="maps.app.goo.gl/..."
            />
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            校舎一覧（ドラッグで並び替え）
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
              disabled={disabled || loading || busy}
              className="text-[11px] underline text-gray-600 hover:text-gray-800 disabled:opacity-40
                         dark:text-gray-300 dark:hover:text-gray-100"
            >
              再読み込み
            </button>
          </div>
        </div>

        {(error || orderDirty) && (
          <div
            className={[
              "mb-2 rounded-md border px-2 py-2 text-xs",
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
            ].join(" ")}
          >
            {error ? (
              error
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>並び替えが未保存です。</span>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={busy}
                  className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white
                             hover:bg-amber-700 disabled:opacity-40
                             dark:bg-amber-500 dark:hover:bg-amber-400"
                >
                  {savingId === "__order__" ? "保存中..." : "並び替えを保存"}
                </button>
              </div>
            )}
          </div>
        )}

        {campuses.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            登録されている校舎はありません。
          </p>
        ) : (
          <div className="space-y-2">
            {campuses.map((c) => {
              const d = drafts[c.id] ?? toDraft(c);
              const dirty = !isSameDraftIgnoringOrder(d, c); // ✅ sortOrderは無視
              const rowSaving = savingId === c.id;
              const rowDeleting = deletingId === c.id;

              const isDragging = draggingId === c.id;
              const isOver =
                dragOverId === c.id && draggingId && draggingId !== c.id;

              return (
                <div
                  key={c.id}
                  draggable={!busy}
                  onDragStart={() => onDragStartRow(c.id)}
                  onDragOver={(e) => onDragOverRow(c.id, e)}
                  onDrop={(e) => onDropRow(c.id, e)}
                  onDragEnd={onDragEndRow}
                  className={[
                    "rounded-lg border bg-white p-2 shadow-sm dark:bg-gray-950",
                    isOver
                      ? "border-blue-400 dark:border-blue-500"
                      : "border-gray-200 dark:border-gray-800",
                    isDragging ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="grid gap-2 md:grid-cols-12">
                    {/* ✅ ドラッグ用ハンドル（見た目だけ。行自体がドラッグ可能） */}
                    <div className="md:col-span-12 flex items-center gap-2 pb-1">
                      <span className="select-none text-[11px] text-gray-400 dark:text-gray-500">
                        ⠿ ドラッグして並び替え
                      </span>
                      {dirty && (
                        <span className="ml-auto text-[10px] text-amber-500">
                          未保存（内容）
                        </span>
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        校舎名
                      </div>
                      <input
                        className={inputBase}
                        value={d.label}
                        onChange={(e) =>
                          setDraft(c.id, { label: e.target.value })
                        }
                        disabled={busy}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        slug
                      </div>
                      <input
                        className={inputBase}
                        value={d.slug}
                        onChange={(e) =>
                          setDraft(c.id, { slug: e.target.value })
                        }
                        disabled={busy}
                      />
                    </div>

                    {/* ✅ sortOrder 表示・編集は削除 */}

                    <div className="md:col-span-5">
                      <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        住所
                      </div>
                      <input
                        className={inputBase}
                        value={d.address}
                        onChange={(e) =>
                          setDraft(c.id, { address: e.target.value })
                        }
                        disabled={busy}
                      />
                    </div>

                    <div className="md:col-span-2 flex items-end justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={d.isActive}
                          onChange={(e) =>
                            setDraft(c.id, { isActive: e.target.checked })
                          }
                          disabled={busy}
                          className="rounded border-gray-300 dark:border-gray-700"
                        />
                        有効
                      </label>
                    </div>

                    <div className="md:col-span-7">
                      <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        アクセス
                      </div>
                      <textarea
                        className={textareaBase + " min-h-[56px]"}
                        value={d.access}
                        onChange={(e) =>
                          setDraft(c.id, { access: e.target.value })
                        }
                        disabled={busy}
                      />
                    </div>

                    <div className="md:col-span-5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          Google Map URL
                        </span>
                        {d.googleMapUrl ? (
                          <a
                            href={d.googleMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] underline text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            開く
                          </a>
                        ) : null}
                      </div>
                      <input
                        className={inputBase}
                        value={d.googleMapUrl}
                        onChange={(e) =>
                          setDraft(c.id, { googleMapUrl: e.target.value })
                        }
                        disabled={busy}
                        placeholder="URL"
                      />
                    </div>

                    <div className="md:col-span-12 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(c.id)}
                        disabled={!dirty || busy}
                        className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white
                                   hover:bg-blue-700 disabled:opacity-40
                                   dark:bg-blue-500 dark:hover:bg-blue-400"
                      >
                        {rowSaving ? "保存中..." : "保存"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancel(c.id)}
                        disabled={!dirty || busy}
                        className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700
                                   hover:bg-gray-100 disabled:opacity-40
                                   dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        戻す
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={busy}
                        className="rounded-full border border-red-300 px-3 py-1 text-[11px] font-semibold text-red-600
                                   hover:bg-red-50 disabled:opacity-40
                                   dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950/30"
                      >
                        {rowDeleting ? "削除中..." : "削除"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {busy && (
          <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            処理中...
          </div>
        )}
      </div>
    </div>
  );
}
