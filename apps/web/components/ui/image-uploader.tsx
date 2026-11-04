"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api-client";

interface ImageUploaderProps {
  value?: string | string[];
  onChange: (url: any) => void;
  multiple?: boolean;
  label?: string;
  maxFiles?: number;
  maxImages?: number;
}

export function ImageUploader({
  value,
  onChange,
  multiple = false,
  label = "Upload Image",
  maxFiles = 5,
  maxImages,
}: ImageUploaderProps) {
  const effectiveMax = maxImages || maxFiles;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images: string[] = Array.isArray(value) ? value : value ? [value] : [];

  const compressAndUpload = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          // Canvas compression to max 1200px width/height in WebP
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/webp", 0.82);

          try {
            const res = await api.post<any>("/upload", {
              data: compressedBase64,
              fileName: file.name.replace(/\.[^/.]+$/, ".webp"),
            });
            if (res.success && res.data?.url) {
              resolve(res.data.url);
            } else {
              setError(res.error?.message || "Upload failed");
              resolve(null);
            }
          } catch (err: any) {
            setError(err.message || "Network upload error");
            resolve(null);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);

    const uploadedUrls: string[] = [];
    const limit = multiple ? Math.min(files.length, effectiveMax - images.length) : 1;

    for (let i = 0; i < limit; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setError("Only JPG, PNG and WebP images are supported.");
        continue;
      }
      const url = await compressAndUpload(file);
      if (url) uploadedUrls.push(url);
    }

    setIsUploading(false);

    if (uploadedUrls.length > 0) {
      if (multiple) {
        onChange([...images, ...uploadedUrls]);
      } else {
        onChange(uploadedUrls[0]);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (multiple) {
      onChange(images.filter((_, idx) => idx !== indexToRemove));
    } else {
      onChange("");
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-xs font-bold text-neutral-800 block">{label}</label>}

      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-50 shadow-2xs"
            >
              <img
                src={imgUrl}
                alt={`Uploaded ${idx + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-opacity min-h-[28px] min-w-[28px] flex items-center justify-center"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1.5 left-1.5 bg-[#0F766E] text-white text-3xs font-extrabold uppercase px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {(!images.length || multiple) && images.length < maxFiles && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
            isUploading
              ? "border-teal-400 bg-teal-50/50"
              : "border-neutral-300 hover:border-[#0F766E] hover:bg-neutral-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-[#0F766E]">
              {isUploading ? (
                <span className="w-4 h-4 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>
            <div className="text-xs">
              <span className="font-bold text-[#0F766E]">Click to upload</span> or drag and drop
            </div>
            <span className="text-3xs text-neutral-500">
              WebP, PNG, JPG (Auto-compressed to &lt; 500KB)
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

