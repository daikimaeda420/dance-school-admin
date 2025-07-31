export async function GET() {
  const session = await getServerSession(authOptions);
  const roles = session?.user?.roles ?? [];

  const isServiceAdmin = roles.includes("service-admin");
  return new Response(JSON.stringify({ ok: isServiceAdmin }), { status: 200 });
}
