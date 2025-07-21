useEffect(() => {
  if (status === "loading") return;

  console.log("✅ session:", session);

  if (status === "authenticated") {
    router.replace("/schools/manage");
  } else {
    router.replace("/login");
  }
}, [status, router]); // ✅ session を除外
