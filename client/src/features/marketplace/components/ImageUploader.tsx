import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";

interface ImageUploaderProps {
  value: string[];
  onChange: (images: string[]) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setError(null);
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        setError("Please upload only image files.");
        return;
      }

      try {
        const encoded = await Promise.all(imageFiles.map((file) => fileToDataUrl(file)));
        onChange([...value, ...encoded].slice(0, 6));
      } catch {
        setError("Image upload failed. Please try again.");
      }
    },
    [onChange, value],
  );

  const onInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await ingestFiles(event.target.files);
      event.target.value = "";
    },
    [ingestFiles],
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      await ingestFiles(event.dataTransfer.files);
    },
    [ingestFiles],
  );

  const removeImage = useCallback(
    (index: number) => {
      onChange(value.filter((_, imageIndex) => imageIndex !== index));
    },
    [onChange, value],
  );

  return (
    <section className="card">
      <h3>Crop Images</h3>
      <p className="muted">Upload up to 6 images using drag and drop or file picker.</p>
      <div
        className={`input ${isDragging ? "ring" : ""}`.trim()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => void onDrop(event)}
        style={{ minHeight: "120px", display: "grid", placeItems: "center", textAlign: "center" }}
      >
        <label htmlFor="marketplace-images" style={{ cursor: "pointer", width: "100%" }}>
          Drop images here or click to browse
        </label>
        <input id="marketplace-images" type="file" accept="image/*" multiple onChange={(event) => void onInputChange(event)} />
      </div>
      {error ? <p className="muted">{error}</p> : null}
      <div className="grid grid-3" style={{ marginTop: "1rem" }}>
        {value.map((image, index) => (
          <article key={`${image}-${index}`} className="card">
            <img src={image} alt={`crop-${index + 1}`} style={{ width: "100%", borderRadius: "8px", objectFit: "cover", maxHeight: "150px" }} />
            <button type="button" className="btn btn-secondary" onClick={() => removeImage(index)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
