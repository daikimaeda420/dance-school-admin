// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

console.log("✅ NEXTAUTH_URL =", process.env.NEXTAUTH_URL); // ← デバッグ用

module.exports = nextConfig;
