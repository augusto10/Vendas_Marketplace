"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFile } from "@/lib/image/compress";

type PagamentoFormProps = {
  pedidoId: string;
  valorTotal: string;
  comprovanteUrl?: string | null;
};

export function PagamentoForm({ pedidoId, valorTotal, comprovanteUrl }: PagamentoFormProps) {
  const router = useRouter();
  const hiddenFileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function openPicker() {
    hiddenFileRef.current?.click();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const selectedFile = file;

      if (selectedFile) {
        const compressedFile = await compressImageFile(selectedFile);
        formData.set("file", compressedFile);
      }

      const response = await fetch(`/api/atacado/pedidos/${pedidoId}/pagamento`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? payload?.message ?? "Nao foi possivel registrar o pagamento.");
      }

      form.reset();
      setFile(null);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel registrar o pagamento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-3 rounded-lg border bg-muted/10 p-3">
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <div className="grid gap-2 sm:grid-cols-4">
          <select name="status" className="form-select w-full" defaultValue="PAGO">
            <option value="PENDENTE">Pendente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGO">Pago</option>
          </select>
          <Input name="valorPago" type="number" step="0.01" defaultValue={valorTotal} className="w-full" />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <input
              ref={hiddenFileRef}
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={openPicker}>
              <Camera className="h-4 w-4" />
              Tirar foto
            </Button>
            <Button type="button" variant="outline" onClick={openPicker}>
              <ImageUp className="h-4 w-4" />
              Escolher arquivo
            </Button>
            <Button type="submit" loading={pending}>
              Registrar
            </Button>
          </div>
        </div>

        {previewUrl ? (
          <div className="space-y-2">
            <Label>Previa do comprovante</Label>
            <div className="overflow-hidden rounded-lg border bg-background">
              <img src={previewUrl} alt="Previa do comprovante" className="max-h-56 w-full object-contain" />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
      </form>

      {comprovanteUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Comprovante salvo no pagamento anterior.</span>
          <a href={comprovanteUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            Ver comprovante
          </a>
        </div>
      ) : null}
    </div>
  );
}
