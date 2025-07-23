// hash-password.ts
import { hash } from "bcryptjs";

const plain = "your-password-here";

hash(plain, 10).then((hashed) => {
  console.log(`🔐 "${plain}" → ${hashed}`);
});
