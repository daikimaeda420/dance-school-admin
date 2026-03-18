// app/(app)/admin/diagnosis/media/MediaAdminClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AdminPageHeader from "../_components/AdminPageHeader";
import {
  adminCard,
  adminInput,
  adminBtnPrimary,
  adminBtnDanger,
} from "../_components/adminStyles";

type Props = { schoolId: string };

export default function MediaAdminClient({ schoolId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [hasBanner, setHasBanner] = useState(false);
  const [bannerTs, setBannerTs] = useState<number>(0);

  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [savingYoutube, setSavingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // バナー取得
      const resBanner = await fetch(
        `/api/admin/diagnosis/media/banner?schoolId=${encodeURIComponent(schoolId)}`,
      );
      if (resBanner.ok) {
        const data = await resBanner.json();
        setHasBanner(data.hasImage);
        if (data.updatedAt) setBannerTs(new Date(data.updatedAt).getTime());
      }

      // 動画取得
      const resVideo = await fetch(
        `/api/admin/diagnosis/media/video?schoolId=${encodeURIComponent(schoolId)}`,
      );
      if (resVideo.ok) {
        const data = await resVideo.json();
        setYoutubeVideoId(data.videoId || null);
      }
    } catch (e: any) {
      console.error(e);
      setError("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
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

      await fetchData();
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

  const topError = error || youtubeError;
  const isAnySaving = saving || savingYoutube;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="画像・動画管理"
        description="診断結果ページ等で表示されるキャンペーンバナー画像やYouTube動画を設定できます。反映は即時行われます。"
        isDirty={false}
        saving={isAnySaving}
        error={topError}
        onSave={() => {}}
        hideSave
      />

      <div className={adminCard}>
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          キャンペーンバナー
        </h2>

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
                className={adminBtnPrimary + " px-4 py-2 text-xs"}
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
                  className={adminBtnDanger + " px-4 py-2 text-xs"}
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

      {/* YouTube動画設定セクション */}
      <div className={adminCard}>
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          YouTube動画埋め込み
        </h2>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="mb-4 text-xs text-gray-600 dark:text-gray-300">
              診断結果画面の「運命のクラスかも？」の下に表示させるYouTube動画のURLを入力してください。<br />
              未設定の場合は動画は表示されません。
            </p>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="例: https://www.youtube.com/watch?v=..."
                value={youtubeUrlInput}
                onChange={(e) => setYoutubeUrlInput(e.target.value)}
                className={adminInput}
              />
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!youtubeUrlInput.trim()) return;
                    setSavingYoutube(true);
                    setYoutubeError(null);
                    try {
                      const res = await fetch("/api/admin/diagnosis/media/video", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ schoolId, url: youtubeUrlInput.trim() }),
                      });
                      if (!res.ok) {
                        const json = await res.json().catch(() => null);
                        throw new Error(json?.message ?? "保存に失敗しました");
                      }
                      setYoutubeUrlInput("");
                      await fetchData();
                    } catch (e: any) {
                      setYoutubeError(e?.message ?? "通信エラー");
                    } finally {
                      setSavingYoutube(false);
                    }
                  }}
                  disabled={loading || savingYoutube || !youtubeUrlInput.trim()}
                  className={adminBtnPrimary + " px-4 py-2 text-xs"}
                >
                  {savingYoutube ? "保存中..." : "動画を設定する"}
                </button>

                {youtubeVideoId && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("動画設定を削除しますか？")) return;
                      setSavingYoutube(true);
                      setYoutubeError(null);
                      try {
                        const res = await fetch("/api/admin/diagnosis/media/video", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ schoolId }),
                        });
                        if (!res.ok) throw new Error("削除に失敗しました");
                        await fetchData();
                      } catch (e: any) {
                        setYoutubeError(e?.message ?? "通信エラー");
                      } finally {
                        setSavingYoutube(false);
                      }
                    }}
                    disabled={savingYoutube}
                    className={adminBtnDanger + " px-4 py-2 text-xs"}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="md:w-[320px]">
            <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              現在の動画プレビュー
            </div>
            {youtubeVideoId ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  width="100%"
                  height="180"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="flex h-[180px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-xs text-gray-400">
                未設定
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
