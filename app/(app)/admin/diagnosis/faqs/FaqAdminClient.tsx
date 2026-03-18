// app/(app)/admin/diagnosis/faqs/FaqAdminClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import AdminPageHeader from "../_components/AdminPageHeader";
import {
  adminCard as card,
  adminInput as inputCls,
  adminTextarea as textareaCls,
  adminBtnPrimary as btnPrimary,
  adminBtn as btnOutline,
  adminBtnDanger as btnDanger,
} from "../_components/adminStyles";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Faq = {
  id: string;
  schoolId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type Props = { schoolId: string };

// ────────────────────────────────────────────────
// SortableItem
// ────────────────────────────────────────────────
type SortableItemProps = {
  faq: Faq;
  index: number;
  savingId: string | null;
  editId: string | null;
  editQ: string;
  editA: string;
  setEditQ: (v: string) => void;
  setEditA: (v: string) => void;
  onToggleActive: (faq: Faq) => void;
  onEdit: (faq: Faq) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
};

function SortableItem({
  faq,
  index,
  savingId,
  editId,
  editQ,
  editA,
  setEditQ,
  setEditA,
  onToggleActive,
  onEdit,
  onEditSave,
  onEditCancel,
  onDelete,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isSaving = savingId === faq.id;
  const isEditing = editId === faq.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-lg border p-3",
        faq.isActive
          ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          : "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-950",
        isDragging ? "shadow-lg" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* ドラッグハンドル */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
            aria-label="ドラッグして並び替え"
            tabIndex={-1}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>
          <span className="text-[10px] font-bold text-gray-400">
            #{index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* 有効/無効 */}
          <button
            onClick={() => onToggleActive(faq)}
            disabled={isSaving}
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-semibold border transition",
              faq.isActive
                ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                : "border-gray-300 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900",
            ].join(" ")}
          >
            {faq.isActive ? "表示中" : "非表示"}
          </button>
          {/* 編集 */}
          {!isEditing && (
            <button
              onClick={() => onEdit(faq)}
              disabled={isSaving}
              className={btnOutline + " px-2 py-0.5 text-[10px]"}
            >
              編集
            </button>
          )}
          {/* 削除 */}
          <button
            onClick={() => onDelete(faq.id)}
            disabled={isSaving}
            className={btnDanger + " px-2 py-0.5 text-[10px]"}
          >
            削除
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-[10px] font-semibold text-gray-500">Q</div>
            <input
              className={inputCls}
              value={editQ}
              onChange={(e) => setEditQ(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold text-gray-500">A</div>
            <textarea
              className={textareaCls}
              value={editA}
              onChange={(e) => setEditA(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onEditSave(faq.id)}
              disabled={isSaving}
              className={btnPrimary + " px-3 py-1 text-[10px]"}
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={onEditCancel}
              className={btnOutline + " px-3 py-1 text-[10px]"}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
            Q. {faq.question}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-600 dark:text-gray-300">
            A. {faq.answer}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// FaqAdminClient (main)
// ────────────────────────────────────────────────
export default function FaqAdminClient({ schoolId }: Props) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規入力
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  // 編集中
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  const disabled = !schoolId;

  // 並び替え保存のdebounce用ref
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const fetchFaqs = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/faqs?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
    } catch (e: any) {
      setError(e?.message ?? "通信エラー");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFaqs((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);

      // debounceして並び替えを保存
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        void saveReorder(
          next.map((f) => f.id),
          schoolId,
        );
      }, 400);

      return next;
    });
  };

  const saveReorder = async (orderedIds: string[], sid: string) => {
    setReordering(true);
    try {
      const res = await fetch("/api/admin/diagnosis/faqs/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: sid, orderedIds }),
      });
      if (!res.ok) throw new Error("並び替えの保存に失敗しました");
    } catch (e: any) {
      setError(e?.message ?? "通信エラー");
    } finally {
      setReordering(false);
    }
  };

  const handleCreate = async () => {
    if (!schoolId || !newQ.trim() || !newA.trim()) {
      setError("質問と回答は必須です。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnosis/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          question: newQ.trim(),
          answer: newA.trim(),
          sortOrder: faqs.length,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message ?? "作成に失敗しました");
      }
      setNewQ("");
      setNewA("");
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message ?? "通信エラー");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (faq: Faq) => {
    setSavingId(faq.id);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleEdit = (faq: Faq) => {
    setEditId(faq.id);
    setEditQ(faq.question);
    setEditA(faq.answer);
  };

  const handleEditSave = async (id: string) => {
    if (!editQ.trim() || !editA.trim()) {
      setError("質問と回答は必須です。");
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editQ.trim(), answer: editA.trim() }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setEditId(null);
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("このFAQを削除しますか？")) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="よくある質問 (FAQ) 管理"
        description="診断結果ページ等で表示されるFAQを追加・編集できます。ドラッグで並び替えが可能です。"
        isDirty={false}
        saving={reordering}
        error={error}
        onSave={() => {}}
        hideSave
      />

      {/* 新規追加 */}
      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          よくある質問を追加
        </h2>
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              Q（質問）
            </div>
            <input
              className={inputCls}
              placeholder="例：体験レッスンはありますか？"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              disabled={disabled || saving}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              A（回答）
            </div>
            <textarea
              className={textareaCls}
              placeholder="例：はい、初回は無料で体験いただけます。"
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              disabled={disabled || saving}
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={disabled || saving || !newQ.trim() || !newA.trim()}
          className={btnPrimary + " mt-3 px-4 py-1.5 text-xs"}
        >
          {saving ? "保存中..." : "追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          FAQ一覧{" "}
          {loading && (
            <span className="text-xs font-normal text-gray-400">読み込み中...</span>
          )}
          {reordering && (
            <span className="text-xs font-normal text-blue-400">保存中...</span>
          )}
        </h2>

        {faqs.length === 0 && !loading ? (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            FAQがまだ登録されていません。
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={faqs.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <SortableItem
                    key={faq.id}
                    faq={faq}
                    index={i}
                    savingId={savingId}
                    editId={editId}
                    editQ={editQ}
                    editA={editA}
                    setEditQ={setEditQ}
                    setEditA={setEditA}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEdit}
                    onEditSave={handleEditSave}
                    onEditCancel={() => setEditId(null)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
