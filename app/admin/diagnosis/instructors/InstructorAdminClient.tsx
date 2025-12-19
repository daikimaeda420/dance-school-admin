"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { initialSchoolId?: string };

type InstructorRow = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  photoMime?: string | null; // 画像の有無判定に使う
};

function slugifyJa(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\_]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";
const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";
const monoInput = input + " font-mono";
const codePill =
  "rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-800 " +
  "dark:bg-gray-800 dark:text-gray-100";
const btnPrimary =
  "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white " +
  "hover:bg-blue-700 disabled:opacity-50 " +
  "dark:bg-blue-500 dark:hover:bg-blue-400";
const btnOutline =
  "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm " +
  "hover:bg-gray-50 disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800";
const btnDanger =
  "rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 " +
  "hover:bg-red-50 disabled:opacity-50 " +
  "dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40";
const thumb =
  "h-12 w-12 rounded-xl border border-gray-200 object-cover dark:border-gray-800";

export default function InstructorAdminClient({ initialSchoolId }: Props) {
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");

  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規作成フォーム
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [newIsActive, setNewIsActive] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);

  // 編集用（行ID単位）
  const [editMap, setEditMap] = useState<
    Record<string, Partial<InstructorRow>>
  >({});
  const [editFileMap, setEditFileMap] = useState<Record<string, File | null>>(
    {}
  );
  const [clearPhotoMap, setClearPhotoMap] = useState<Record<string, boolean>>(
    {}
  );

  const canLoad = schoolId.trim().length > 0;

  const photoUrl = (id: string) =>
    `/api/diagnosis/instructors/photo?id=${encodeURIComponent(
      id
    )}&schoolId=${encodeURIComponent(schoolId)}`;

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/instructors?schoolId=${encodeURIComponent(schoolId)}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error("DiagnosisInstructor の取得に失敗しました");
      const data = (await res.json()) as any[];

      const normalized: InstructorRow[] = data.map((d) => ({
        id: String(d.id),
        schoolId: String(d.schoolId ?? schoolId),
        label: String(d.label ?? ""),
        slug: String(d.slug ?? ""),
        sortOrder: Number(d.sortOrder ?? 1),
        isActive: Boolean(d.isActive ?? true),
        photoMime: typeof d.photoMime === "string" ? d.photoMime : null,
      }));

      setRows(normalized.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canLoad) void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const createInstructor = async () => {
    if (!schoolId.trim()) return;

    const id = newId.trim();
    const label = newLabel.trim();
    const slug = newSlug.trim();
    if (!id || !label || !slug) {
      setError("id / label / slug は必須です");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("schoolId", schoolId);
      fd.append("label", label);
      fd.append("slug", slug);
      fd.append("sortOrder", String(newSortOrder));
      fd.append("isActive", String(newIsActive));
      if (newFile) fd.append("file", newFile);

      const res = await fetch("/api/diagnosis/instructors", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました");
      }

      setNewId("");
      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(1);
      setNewIsActive(true);
      setNewFile(null);

      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: InstructorRow) => {
    setEditMap((prev) => ({ ...prev, [r.id]: { ...r } }));
    setEditFileMap((prev) => ({ ...prev, [r.id]: null }));
    setClearPhotoMap((prev) => ({ ...prev, [r.id]: false }));
  };

  const cancelEdit = (id: string) => {
    setEditMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditFileMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setClearPhotoMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEditField = (id: string, patch: Partial<InstructorRow>) => {
    setEditMap((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  };

  const saveEdit = async (id: string) => {
    const e = editMap[id];
    if (!e) return;

    if (!e.slug?.trim() || !e.label?.trim()) {
      setError("label / slug は必須です");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("schoolId", schoolId);
      fd.append("label", String(e.label));
      fd.append("slug", String(e.slug));
      fd.append("sortOrder", String(e.sortOrder ?? 0));
      fd.append("isActive", String(e.isActive ?? true));
      fd.append("clearPhoto", String(clearPhotoMap[id] ?? false));

      const file = editFileMap[id];
      if (file) fd.append("file", file);

      const res = await fetch("/api/diagnosis/instructors", {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "更新に失敗しました");
      }

      cancelEdit(id);
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/instructors?id=${encodeURIComponent(
          id
        )}&schoolId=${encodeURIComponent(schoolId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "無効化に失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "無効化に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const hintId = useMemo(
    () => `instructor_${slugifyJa(newLabel) || "new"}`,
    [newLabel]
  );
  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  const previewForNew = useMemo(
    () => (newFile ? URL.createObjectURL(newFile) : ""),
    [newFile]
  );

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：講師管理</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          画像は管理画面からアップロードしてDBに保存します（上限はAPI内で制御）。
        </div>
      </div>

      {/* schoolId */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          schoolId
        </div>
        <input
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className={input}
          placeholder="例：daiki.maeda.web（他のIDでもOK）"
        />
      </div>

      {/* create */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-3 text-sm font-semibold">新規追加</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              label
            </div>
            <input
              value={newLabel}
              onChange={(e) => {
                const v = e.target.value;
                setNewLabel(v);
                if (!newSlug) setNewSlug(slugifyJa(v));
                if (!newId) setNewId(`instructor_${slugifyJa(v) || "new"}`);
              }}
              className={input}
              placeholder="例：田中先生"
            />
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              id例：<code className={codePill}>{hintId}</code> / slug例：{" "}
              <code className={codePill}>{hintSlug || "tanaka"}</code>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              id（text）
            </div>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className={monoInput}
              placeholder="例：instructor_tanaka"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              slug（診断回答で送る値）
            </div>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className={monoInput}
              placeholder="例：tanaka"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              画像（DB保存）
            </div>
            <div className="flex items-center gap-3">
              <img
                src={
                  previewForNew ||
                  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                }
                className={thumb}
                alt=""
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className={input}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div>
              <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                sortOrder
              </div>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                className={input}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                active
              </label>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={createInstructor}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? "保存中..." : "追加する"}
          </button>
          <button
            type="button"
            onClick={fetchList}
            disabled={loading || !canLoad}
            className={btnOutline}
          >
            再読み込み
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* list */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">一覧</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length} 件 {loading ? "（読み込み中）" : ""}
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-200">
            まだ講師がありません。上のフォームから追加してください。
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const editing = editMap[r.id] !== undefined;
              const e = editMap[r.id] as Partial<InstructorRow> | undefined;
              const current = editing ? (e as InstructorRow) : r;

              const file = editFileMap[r.id] ?? null;
              const localPreview = file ? URL.createObjectURL(file) : "";
              const hasDbPhoto = Boolean(r.photoMime);

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {editing ? (
                          <input
                            value={current.label ?? ""}
                            onChange={(ev) =>
                              updateEditField(r.id, { label: ev.target.value })
                            }
                            className={input}
                          />
                        ) : (
                          r.label
                        )}
                      </div>

                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            id
                          </div>
                          <div className="font-mono text-[12px] text-gray-700 dark:text-gray-200">
                            {r.id}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            slug
                          </div>
                          {editing ? (
                            <input
                              value={current.slug ?? ""}
                              onChange={(ev) =>
                                updateEditField(r.id, { slug: ev.target.value })
                              }
                              className={monoInput}
                            />
                          ) : (
                            <div className="font-mono text-[12px] text-gray-700 dark:text-gray-200">
                              {r.slug}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            画像
                          </div>

                          <div className="mt-1 flex items-center gap-3">
                            <img
                              src={
                                localPreview ||
                                (hasDbPhoto
                                  ? photoUrl(r.id)
                                  : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")
                              }
                              className={thumb}
                              alt=""
                            />

                            {editing ? (
                              <div className="flex w-full flex-col gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(ev) => {
                                    const f = ev.target.files?.[0] ?? null;
                                    setEditFileMap((p) => ({
                                      ...p,
                                      [r.id]: f,
                                    }));
                                    if (f)
                                      setClearPhotoMap((p) => ({
                                        ...p,
                                        [r.id]: false,
                                      }));
                                  }}
                                  className={input}
                                />

                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(
                                      clearPhotoMap[r.id] ?? false
                                    )}
                                    onChange={(ev) => {
                                      const checked = ev.target.checked;
                                      setClearPhotoMap((p) => ({
                                        ...p,
                                        [r.id]: checked,
                                      }));
                                      if (checked)
                                        setEditFileMap((p) => ({
                                          ...p,
                                          [r.id]: null,
                                        }));
                                    }}
                                  />
                                  画像を削除（DBからnullにする）
                                </label>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {hasDbPhoto ? "DB保存済み" : "未設定"}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:col-span-3">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              sortOrder
                            </div>
                            {editing ? (
                              <input
                                type="number"
                                value={Number(current.sortOrder ?? 1)}
                                onChange={(ev) =>
                                  updateEditField(r.id, {
                                    sortOrder: Number(ev.target.value),
                                  })
                                }
                                className={input}
                              />
                            ) : (
                              <div className="text-[12px] text-gray-700 dark:text-gray-200">
                                {r.sortOrder}
                              </div>
                            )}
                          </div>

                          <div className="flex items-end">
                            {editing ? (
                              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(current.isActive)}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      isActive: ev.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300 dark:border-gray-700"
                                />
                                active
                              </label>
                            ) : (
                              <div
                                className={[
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  r.isActive
                                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                                ].join(" ")}
                              >
                                {r.isActive ? "active" : "inactive"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            disabled={saving}
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => deactivate(r.id)}
                            disabled={saving}
                            className={btnDanger}
                          >
                            無効化
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={saving}
                            className={btnPrimary.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(r.id)}
                            disabled={saving}
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        次：<code className={codePill}>/admin/diagnosis/links</code>{" "}
        に戻って、Result と Instructor をチェックで紐づけしてください。
      </div>
    </div>
  );
}
