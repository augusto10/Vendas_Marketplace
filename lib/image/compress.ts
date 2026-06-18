type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
};

export async function compressImageFile(file: File, options: CompressImageOptions = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = "image/jpeg"
  } = options;

  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Nao foi possivel reduzir a imagem."));
        return;
      }
      resolve(result);
    }, mimeType, quality);
  });

  if (!blob.size) {
    return file;
  }

  const fileName = replaceExtension(file.name, "jpg");
  return new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now()
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel ler a imagem."));
    };
    image.src = objectUrl;
  });
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
  return `${baseName}.${extension}`;
}
