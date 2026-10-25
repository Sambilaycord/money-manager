"use client";

import { AVATAR_SIZE } from "@money-manager/shared";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Avatar } from "@/components/app/avatar";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { removeAvatar, uploadAvatar } from "./actions";

/**
 * Crops the picture to a centred square and shrinks it, so uploads stay small
 * whatever the camera produced. JPEG because every browser can encode it.
 */
async function shrinkToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding the picture failed"))),
      "image/jpeg",
      0.85,
    ),
  );
}

interface AvatarPickerProps {
  name: string;
  imageUrl: string | null;
}

export function AvatarPicker({ name, imageUrl }: AvatarPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
    if (!file) return;
    setError(null);
    startSaving(async () => {
      let picture: Blob;
      try {
        picture = await shrinkToSquare(file);
      } catch (shrinkError) {
        console.error("Preparing avatar failed", shrinkError);
        setError("That file couldn't be read as a picture. Try a JPEG or PNG.");
        return;
      }
      const formData = new FormData();
      formData.append("avatar", new File([picture], "avatar.jpg", { type: "image/jpeg" }));
      const result = await uploadAvatar(formData);
      if (result.error) setError(result.error);
    });
  };

  const remove = () => {
    setError(null);
    startSaving(async () => {
      const result = await removeAvatar();
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar name={name} size="xl" imageUrl={imageUrl} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choose}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className={buttonClassName("secondary")}
          >
            {isPending ? "Saving…" : imageUrl ? "Change picture" : "Upload picture"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className={buttonClassName("ghost")}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
