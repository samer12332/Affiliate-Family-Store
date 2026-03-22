"use client";

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.72;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load selected image"));
    };
    image.src = objectUrl;
  });
}

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }

  const image = await loadImage(file);
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to prepare image upload");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to compress selected image"));
          return;
        }
        resolve(result);
      },
      "image/webp",
      IMAGE_QUALITY
    );
  });

  const safeName = file.name.replace(/\.[^.]+$/, "") || "product-image";
  return new File([blob], `${safeName}.webp`, { type: "image/webp" });
}

export function createObjectPreview(file: File): string {
  return URL.createObjectURL(file);
}
