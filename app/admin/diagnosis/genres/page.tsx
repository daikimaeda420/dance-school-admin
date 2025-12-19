// app/admin/diagnosis/genres/page.tsx
import GenreAdminClient from "./GenreAdminClient";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  return <GenreAdminClient initialSchoolId={searchParams.schoolId ?? ""} />;
}
