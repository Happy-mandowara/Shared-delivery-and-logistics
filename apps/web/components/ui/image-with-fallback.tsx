"use client";

import React, { useState } from "react";
import { Package } from "lucide-react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackIcon?: React.ReactNode;
}

export function ImageWithFallback({
  src,
  alt = "Media item",
  className = "",
  fallbackSrc,
  fallbackIcon,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    if (fallbackSrc && !hasError) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          onError={() => setHasError(true)}
          {...props}
        />
      );
    }
    return (
      <div className={`bg-neutral-100 flex items-center justify-center text-neutral-300 ${className}`}>
        {fallbackIcon || <Package className="w-8 h-8 text-neutral-300" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
