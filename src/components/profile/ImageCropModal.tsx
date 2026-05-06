"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.92,
      );
    };
    image.onerror = (e) => reject(e);
    image.src = imageSrc;
  });
}

type Props = {
  imageSrc: string;
  aspect: number;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  shape?: "round" | "rect";
};

export function ImageCropModal({ imageSrc, aspect, title, onCancel, onConfirm, shape = "rect" }: Props) {
  const t = useTranslations("imageCrop");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="relative h-72 w-full overflow-hidden rounded-xl bg-black"
          style={{ position: "relative" }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            aspect={aspect}
            cropShape={shape}
            showGrid={false}
            restrictPosition={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={(mediaSize) => {
              // El área del cropper tiene el aspect ratio definido
              // Necesitamos que la imagen LLENE el área, no que quepa dentro
              // Calculamos el zoom mínimo para cubrir el área completamente
              const mediaAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;

              let newMinZoom: number;
              if (mediaAspect > aspect) {
                // imagen más ancha que el área → ajustar por altura
                newMinZoom = mediaSize.height / mediaSize.naturalHeight;
              } else {
                // imagen más alta que el área → ajustar por ancho
                newMinZoom = mediaSize.width / mediaSize.naturalWidth;
              }

              const safeMin = Math.max(0.1, newMinZoom);
              setMinZoom(safeMin);
              setZoom(safeMin);
            }}
            style={{
              containerStyle: { width: "100%", height: "100%", position: "relative" },
              mediaStyle: { maxHeight: "none" },
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(minZoom, z - 0.1))}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={minZoom}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
            <Check className="mr-1.5 h-4 w-4" />
            {t("apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
