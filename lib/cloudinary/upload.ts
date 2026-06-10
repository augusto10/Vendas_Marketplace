import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const maxFileSize = 8 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export type UploadedImage = {
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
};

export async function uploadImage(file: File, folder: string): Promise<UploadedImage> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary nao configurado.");
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Tipo de imagem nao permitido.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Imagem acima do limite de 8MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto"
      },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error("Falha ao enviar imagem."));
          return;
        }
        resolve(response);
      }
    );

    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    mimeType: file.type,
    size: file.size,
    width: result.width,
    height: result.height
  };
}

export function cloudinaryFolder(child: string) {
  const base = process.env.CLOUDINARY_FOLDER || "atacado";
  return `${base}/${child}`;
}

