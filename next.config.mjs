/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Kamu bisa menambahkan domain lain di sini nanti kalau butuh (misal: googleusercontent untuk foto profil Google)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com", // Jaga-jaga kalau pakai Firebase Storage
      }
    ],
  },
};

export default nextConfig;