ALTER TABLE "atacado_produtos"
ADD COLUMN "codigo" TEXT,
ADD COLUMN "codigoBarras" TEXT;

CREATE INDEX "atacado_produtos_codigo_idx" ON "atacado_produtos"("codigo");
CREATE INDEX "atacado_produtos_codigoBarras_idx" ON "atacado_produtos"("codigoBarras");
