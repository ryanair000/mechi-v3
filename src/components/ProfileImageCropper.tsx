'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

type MediaKind = 'avatar' | 'cover';

type ImageDimensions = {
  height: number;
  width: number;
};

type DragState = {
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

interface ProfileImageCropperProps {
  kind: MediaKind;
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

const PREVIEW_SIZE = {
  avatar: { width: 280, height: 280, aspectLabel: '1:1' },
  cover: { width: 420, height: 210, aspectLabel: '2:1' },
} as const;

const OUTPUT_SIZE = {
  avatar: { width: 800, height: 800 },
  cover: { width: 1800, height: 900 },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDisplayedImageDimensions(
  imageWidth: number,
  imageHeight: number,
  previewWidth: number,
  previewHeight: number,
  scale: number
) {
  const baseScale = Math.max(previewWidth / imageWidth, previewHeight / imageHeight);

  return {
    height: imageHeight * baseScale * scale,
    width: imageWidth * baseScale * scale,
  };
}

export function ProfileImageCropper({
  kind,
  file,
  onCancel,
  onConfirm,
}: ProfileImageCropperProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setImageDimensions(null);
    dragStateRef.current = null;
    setDragging(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, kind]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    let cancelled = false;
    const image = new window.Image();
    image.src = previewUrl;

    image.onload = () => {
      if (cancelled) {
        return;
      }

      setImageDimensions({
        height: image.naturalHeight || image.height,
        width: image.naturalWidth || image.width,
      });
    };

    image.onerror = () => {
      if (!cancelled) {
        setImageDimensions(null);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const preview = PREVIEW_SIZE[kind];
  const displayedImageDimensions = imageDimensions
    ? getDisplayedImageDimensions(imageDimensions.width, imageDimensions.height, preview.width, preview.height, scale)
    : { height: preview.height * scale, width: preview.width * scale };
  const maxOffsetX = Math.max(0, (displayedImageDimensions.width - preview.width) / 2);
  const maxOffsetY = Math.max(0, (displayedImageDimensions.height - preview.height) / 2);

  useEffect(() => {
    setOffsetX((current) => clamp(current, -maxOffsetX, maxOffsetX));
    setOffsetY((current) => clamp(current, -maxOffsetY, maxOffsetY));
  }, [maxOffsetX, maxOffsetY]);

  const clampOffsets = (nextOffsetX: number, nextOffsetY: number) => ({
    offsetX: clamp(nextOffsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(nextOffsetY, -maxOffsetY, maxOffsetY),
  });

  const startDrag = (clientX: number, clientY: number) => {
    dragStateRef.current = {
      startClientX: clientX,
      startClientY: clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
    setDragging(true);
  };

  const updateDrag = (clientX: number, clientY: number) => {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const nextOffsets = clampOffsets(
      dragState.startOffsetX + (clientX - dragState.startClientX),
      dragState.startOffsetY + (clientY - dragState.startClientY)
    );

    setOffsetX(nextOffsets.offsetX);
    setOffsetY(nextOffsets.offsetY);
  };

  const endDrag = () => {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    setDragging(false);
  };

  const handleConfirm = async () => {
    if (!previewUrl) {
      return;
    }

    setSaving(true);
    try {
      const image = new window.Image();
      image.src = previewUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Image failed to load'));
      });

      const output = OUTPUT_SIZE[kind];
      const canvas = document.createElement('canvas');
      canvas.width = output.width;
      canvas.height = output.height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas is not available');
      }

      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const { width: scaledWidth, height: scaledHeight } = getDisplayedImageDimensions(
        sourceWidth,
        sourceHeight,
        preview.width,
        preview.height,
        scale
      );
      const previewX = (preview.width - scaledWidth) / 2 + offsetX;
      const previewY = (preview.height - scaledHeight) / 2 + offsetY;
      const scaleX = output.width / preview.width;
      const scaleY = output.height / preview.height;

      context.drawImage(
        image,
        previewX * scaleX,
        previewY * scaleY,
        scaledWidth * scaleX,
        scaledHeight * scaleY
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (nextBlob) => resolve(nextBlob),
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.92
        );
      });

      if (!blob) {
        throw new Error('Could not prepare cropped image');
      }

      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(11,17,33,0.72)] backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close image cropper"
      />

      <div className="card relative z-[1] w-full max-w-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">{kind === 'avatar' ? 'Display photo' : 'Cover photo'}</p>
            <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Crop and position before upload
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Keep the important part in frame. Aspect ratio is locked at {preview.aspectLabel}.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
          <div
            className="relative mx-auto overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--surface)]"
            style={{ width: preview.width, maxWidth: '100%', height: preview.height, touchAction: 'none' }}
            onMouseDown={(event) => {
              event.preventDefault();
              startDrag(event.clientX, event.clientY);
            }}
            onMouseMove={(event) => updateDrag(event.clientX, event.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={(event) => {
              const touch = event.touches[0];

              if (!touch) {
                return;
              }

              startDrag(touch.clientX, touch.clientY);
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];

              if (!touch) {
                return;
              }

              event.preventDefault();
              updateDrag(touch.clientX, touch.clientY);
            }}
            onTouchEnd={endDrag}
            onTouchCancel={endDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Crop preview"
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              style={{
                cursor: dragging ? 'grabbing' : 'grab',
                height: displayedImageDimensions.height,
                transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                width: displayedImageDimensions.width,
              }}
            />
          </div>

          <p className="mt-3 text-center text-xs text-[var(--text-soft)]">Drag to reposition</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Zoom
              </span>
              <input
                type="range"
                min="1"
                max="2.4"
                step="0.01"
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                className="w-full"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Horizontal
              </span>
              <input
                type="range"
                min={-maxOffsetX}
                max={maxOffsetX}
                step="1"
                value={offsetX}
                onChange={(event) => {
                  const nextOffsets = clampOffsets(Number(event.target.value), offsetY);
                  setOffsetX(nextOffsets.offsetX);
                  setOffsetY(nextOffsets.offsetY);
                }}
                className="w-full"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Vertical
              </span>
              <input
                type="range"
                min={-maxOffsetY}
                max={maxOffsetY}
                step="1"
                value={offsetY}
                onChange={(event) => {
                  const nextOffsets = clampOffsets(offsetX, Number(event.target.value));
                  setOffsetX(nextOffsets.offsetX);
                  setOffsetY(nextOffsets.offsetY);
                }}
                className="w-full"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-outline justify-center" disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleConfirm()} className="btn-primary justify-center" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Preparing...
              </>
            ) : (
              'Use this crop'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
