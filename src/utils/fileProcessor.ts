import { SelectedFileState } from '../components/NoteUploader';

export async function processUploadedFile(file: File): Promise<SelectedFileState> {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(file.name);

  let previewUrl: string | undefined = undefined;
  let dimensions: { width: number; height: number } | undefined = undefined;
  let audioDuration: number | undefined = undefined;

  if (isImage) {
    previewUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          dimensions = { width: img.naturalWidth, height: img.naturalHeight };
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      // Ignore dimension read failures
    }
  }

  if (isAudio) {
    try {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            audioDuration = Math.round(audio.duration);
          }
          resolve();
        };
        audio.onerror = () => resolve();
        setTimeout(resolve, 1500);
      });
      previewUrl = audioUrl;
    } catch {
      // Audio metadata fallback
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
        previewUrl,
        isImage,
        isPdf,
        isAudio,
        dimensions,
        audioDuration,
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const magnitude = Math.floor(Math.log(bytes) / Math.log(1024));
  const normalized = bytes / Math.pow(1024, magnitude);
  return `${normalized.toFixed(magnitude === 0 ? 0 : 1)} ${units[magnitude]}`;
}
