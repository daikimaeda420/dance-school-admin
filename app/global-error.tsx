"use client";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <html>
      <body className="p-6">
        <h2>問題が発生しました</h2>
        <p className="text-sm text-gray-600 break-words">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-gray-400">digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="mt-3 rounded bg-gray-800 px-3 py-1.5 text-white text-sm"
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
