export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ margin: 0 }}>{children}</div>;
}
