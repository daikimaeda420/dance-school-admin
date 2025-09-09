// components/Footer.tsx
type FooterProps = {
  siteName?: string;
  startYear?: number; // 途中で創業年も出したい場合用（任意）
};

export default function Footer({
  siteName = "サイト名",
  startYear,
}: FooterProps) {
  const y = new Date().getFullYear();
  const yearText = startYear && startYear < y ? `${startYear}–${y}` : `${y}`;

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-10">
      <div className="max-w-screen-xl mx-auto px-4">
        <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          © {yearText} {siteName}
        </p>
      </div>
    </footer>
  );
}
