import { getPresignedImageUploadUrlFn } from "~/fn/storage";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageUploadResult {
  imageKey: string;
}

export async function uploadImageWithPresignedUrl(
  key: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> {
  // Get presigned URL from server
  const { presignedUrl } = await getPresignedImageUploadUrlFn({
    data: { imageKey: key },
  });

  // Create XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          imageKey: key,
        });
      } else {
        reject(new Error(`Image upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Image upload failed: Network error"));
    };

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
