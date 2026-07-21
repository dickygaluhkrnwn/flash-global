/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com", 
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com", // <-- TAMBAHAN BARU UNTUK AVATAR INITIAL
      }
    ],
  },
};

export default nextConfig;