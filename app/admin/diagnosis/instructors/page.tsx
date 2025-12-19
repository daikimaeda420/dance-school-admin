import InstructorAdminClient from "./InstructorAdminClient";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const schoolId = searchParams.schoolId ?? "";
  return <InstructorAdminClient schoolId={schoolId} />;
}
