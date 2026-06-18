"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/image/compress";
import { AtacadoStatusBadge } from "@/features/atacado/status";

type EntregaConclusaoModalProps = {
  entrega: {
    id: string;
    pedidoNumero: string;
    clienteNome: string;
    motoristaNome: string;
    tipo: string;
    endereco: string | null;
    observacao: string | null;
    status: string;
  };
};

export function EntregaConclusaoModal({ entrega }: EntregaConclusaoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Concluir entrega
      </Button>
      {open ? <EntregaConclusaoDialog entrega={entrega} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function EntregaConclusaoDialog({ entrega, onClose }: { entrega: EntregaConclusaoModalProps["entrega"]; onClose: () => void }) {
  const router = useRouter();
  const [recebedorNome, setRecebedorNome] = useState("");
  const [observacao, setObservacao] = useState(entrega.observacao ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenFileRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (!cameraOpen) {
      stopCameraStream();
      return;
    }

    let active = true;
    setCameraError(null);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } }
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch {
        if (active) {
          setCameraError("Nao foi possivel abrir a camera. Use a galeria como alternativa.");
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      stopCameraStream();
    };
  }, [cameraOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Adicione uma foto da entrega.");
      return;
    }

    setPending(true);
    try {
      const compressedFile = await compressImageFile(file);
      const formData = new FormData();
      formData.set("recebedorNome", recebedorNome.trim());
      if (observacao.trim()) {
        formData.set("observacao", observacao.trim());
      }
      formData.set("file", compressedFile);

      const response = await fetch(`/api/atacado/entregas/${entrega.id}/concluir`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? payload?.message ?? "Nao foi possivel concluir a entrega.");
      }

      router.refresh();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel concluir a entrega.");
    } finally {
      setPending(false);
    }
  }

  function openGalleryPicker() {
    hiddenFileRef.current?.click();
  }

  function openCamera() {
    setCameraOpen(true);
  }

  function stopCameraStream() {
    const video = videoRef.current;
    const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) {
      video.srcObject = null;
    }
  }

  async function captureCameraPhoto() {
    const video = videoRef.current;
    if (!video) {
      setCameraError("Camera nao esta disponivel no momento.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError("A camera ainda nao carregou. Tente novamente.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Nao foi possivel capturar a foto.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCameraError("Nao foi possivel capturar a foto.");
      return;
    }

    setFile(new File([blob], `entrega-${entrega.id}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    setCameraOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <div className="text-sm text-muted-foreground">Concluir entrega</div>
            <h2 className="text-xl font-semibold">Pedido {entrega.pedidoNumero}</h2>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <InfoGroup
            title="Entrega"
            rows={[
              ["Status", <AtacadoStatusBadge key="status" status={entrega.status} />],
              ["Tipo", entrega.tipo],
              ["Endereco", entrega.endereco || "-"],
              ["Motorista", entrega.motoristaNome]
            ]}
          />
          <InfoGroup
            title="Pedido"
            rows={[
              ["Numero", entrega.pedidoNumero],
              ["Cliente", entrega.clienteNome]
            ]}
          />
          <InfoGroup
            title="Orientacao"
            rows={[
              ["Foto", "Use a camera do celular ou selecione uma imagem."],
              ["Upload", "A foto sera reduzida antes de enviar para o Cloudinary."],
              ["Observacao", "Se houver algo na entrega, registre no campo abaixo."]
            ]}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border-t p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`recebedor-${entrega.id}`}>Nome de quem recebeu</Label>
              <Input
                id={`recebedor-${entrega.id}`}
                value={recebedorNome}
                onChange={(event) => setRecebedorNome(event.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Foto da entrega</Label>
              <input
                ref={hiddenFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={openCamera}>
                  <Camera className="h-4 w-4" />
                  Tirar foto
                </Button>
                <Button type="button" variant="outline" onClick={openGalleryPicker}>
                  <ImageUp className="h-4 w-4" />
                  Escolher da galeria
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                O botao de foto abre a camera do celular; a galeria fica como alternativa.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`obs-${entrega.id}`}>Observacao</Label>
            <textarea
              id={`obs-${entrega.id}`}
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Ex.: portaria, contato, complemento, horario, avaria..."
              rows={4}
              className={cn(
                "flex min-h-[110px] w-full rounded-xl border border-input/80 bg-background px-3.5 py-2 text-sm text-foreground shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/25"
              )}
            />
          </div>

          {previewUrl ? (
            <div className="space-y-2">
              <Label>Previa da foto</Label>
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                <img src={previewUrl} alt="Previa da foto da entrega" className="max-h-72 w-full object-contain" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {cameraOpen ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">Camera</div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(false)}>
                  Fechar camera
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border bg-black">
                <video ref={videoRef} playsInline className="h-auto w-full" />
              </div>
              {cameraError ? <div className="text-sm text-red-600 dark:text-red-300">{cameraError}</div> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCameraOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={captureCameraPhoto}>
                  <Camera className="h-4 w-4" />
                  Capturar foto
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              <CheckCircle2 className="h-4 w-4" />
              Finalizar entrega
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoGroup({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 font-medium">{title}</div>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-t pt-2 first:border-t-0 first:pt-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
