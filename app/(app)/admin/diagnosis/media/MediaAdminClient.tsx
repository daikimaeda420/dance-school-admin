// app/(app)/admin/diagnosis/media/MediaAdminClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Props = { schoolId: string };

export default function MediaAdminClient({ schoolId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [hasBanner, setHasBanner] = useState(false);
  const [bannerTs, setBannerTs] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBannerState = async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(
        `/api/admin/diagnosis/media/banner?schoolId=${encodeURIComponent(schoolId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setHasBanner(data.hasImage);
        if (data.updatedAt) setBannerTs(new Date(data.updatedAt).getTime());
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBannerState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError("画像サイズは 3MB 以下にしてください。");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("file", file);

      const res = await fetch("/api/admin/diagnosis/media/banner", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? "保存に失敗しました");
      }

      await fetchBannerState();
      setBannerTs(Date.now());
    } catch (err: any) {
      setError(err?.message ?? "通信エラー");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("バナー画像を削除してもよろしいですか？")) return;
    
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnosis/media/banner", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setHasBanner(false);
    } catch (err: any) {
      setError(err?.message ?? "通信エラー");
    } finally {
      setSaving(false);
    }
  };

  if (!schoolId) return <div className="text-sm p-4 text-red-500">schoolId がありません。</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          キャンペーンバナー
        </h2>
        
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="mb-4 text-xs text-gray-600 dark:text-gray-300">
              診断結果画面の「キャンペーン実施中！」部分に表示される画像を設定できます。<br />
              未設定の場合はデフォルトのグレー背景が表示されます。<br />
              <span className="text-gray-400">推奨サイズ: 600px x 180px 以下、上限 3MB (JPEG/PNG)</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleUploadClick}
                disabled={loading || saving}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "アップロード中..." : "画像を選択して変更"}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
              />
              
              {hasBanner && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  削除
                </button>
              )}
            </div>
          </div>

          <div className="md:w-64">
            <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              現在のバナープレビュー
            </div>
            {hasBanner ? (
              <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 aspect-[10/3] w-full max-w-[400px]">
                <Image
                  src={`/api/diagnosis/media/banner?schoolId=${encodeURIComponent(schoolId)}&ts=${bannerTs}`}
                  alt="キャンペーンバナー"
                  fill
                  sizes="400px"
                  style={{ objectFit: "contain" }}
                  unoptimized // DBからの直接配信のため
                />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 aspect-[10/3] w-full max-w-[400px] text-xs text-gray-400">
                未設定
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
