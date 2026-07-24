export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Konfigurasi Cloudinary belum disetting di .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.secure_url) {
    return data.secure_url;
  } else {
    throw new Error(data.error?.message || "Gagal mengunggah gambar.");
  }
};