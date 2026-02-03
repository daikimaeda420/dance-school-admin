// app/admin/diagnosis/instructors/page.tsx
import InstructorAdminClient from "./InstructorAdminClient";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const initialSchoolId = searchParams.schoolId ?? "";
  return <InstructorAdminClient initialSchoolId={initialSchoolId} />;
}
