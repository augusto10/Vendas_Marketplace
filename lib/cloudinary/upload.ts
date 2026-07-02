import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import sharp from "sharp";

const maxFileSize = 8 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const allowedFileMimeTypes = new Set([...allowedMimeTypes, "application/pdf"]);

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

export type UploadedFile = UploadedImage;

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

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const { buffer, mimeType, size, width, height } = await optimizeImage(originalBuffer, file.type);
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
    mimeType,
    size,
    width: result.width ?? width,
    height: result.height ?? height
  };
}

export async function uploadFile(file: File, folder: string): Promise<UploadedFile> {
  if (file.type !== "application/pdf") {
    return uploadImage(file, folder);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary nao configurado.");
  }

  if (!allowedFileMimeTypes.has(file.type)) {
    throw new Error("Tipo de arquivo nao permitido.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Arquivo acima do limite de 8MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw"
      },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error("Falha ao enviar arquivo."));
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
    size: file.size
  };
}

async function optimizeImage(buffer: Buffer, inputMimeType: string) {
  const image = sharp(buffer).rotate().resize({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true
  });

  const shouldPreserveAlpha = inputMimeType === "image/png" || inputMimeType === "image/webp";
  const output = shouldPreserveAlpha
    ? await image.webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
    : await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    mimeType: shouldPreserveAlpha ? "image/webp" : "image/jpeg",
    size: output.info.size,
    width: output.info.width,
    height: output.info.height
  };
}

export function cloudinaryFolder(child: string) {
  const base = process.env.CLOUDINARY_FOLDER || "atacado";
  return `${base}/${child}`;
}
