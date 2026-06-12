"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updatePedidoStatusAction } from "@/features/atacado/actions";
import { CheckCircle2, Clock } from "lucide-react";

interface PedidoSeparacaoFormProps {
  pedidoId: string;
  currentStatus: string;
}

export function PedidoSeparacaoForm({ pedidoId, currentStatus }: PedidoSeparacaoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatusChange = async (newStatus: "SEPARANDO" | "SEPARADO") => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("pedidoId", pedidoId);
      formData.append("status", newStatus);
      await updatePedidoStatusAction(formData);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações de Separação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Atualize o status do pedido conforme avança na separação dos produtos.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {currentStatus === "CONFIRMADO" && (
              <Button
                onClick={() => handleStatusChange("SEPARANDO")}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                {isSubmitting ? "Atualizando..." : "Iniciar Separação"}
              </Button>
            )}

            {(currentStatus === "CONFIRMADO" || currentStatus === "SEPARANDO") && (
              <Button
                onClick={() => handleStatusChange("SEPARADO")}
                disabled={isSubmitting}
                variant="default"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Atualizando..." : "Marcar como Separado"}
              </Button>
            )}

            {currentStatus === "SEPARADO" && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✓ Pedido já foi separado
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
