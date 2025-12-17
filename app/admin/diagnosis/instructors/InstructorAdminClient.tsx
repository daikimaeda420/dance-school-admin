"use client";

export default function InstructorAdminClient({
  schoolId,
}: {
  schoolId: string;
}) {
  return (
    <div className="rounded border p-4">
      <p className="text-sm">
        Instructor Admin (schoolId: {schoolId || "未指定"})
      </p>
    </div>
  );
}
