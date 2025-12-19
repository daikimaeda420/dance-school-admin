import GenreAdminClient from "./GenreAdminClient";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const schoolId = searchParams.schoolId ?? "daiki.maeda.web";
  return <GenreAdminClient initialSchoolId={schoolId} />;
}
