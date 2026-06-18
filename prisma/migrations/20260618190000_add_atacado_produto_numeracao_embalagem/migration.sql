ALTER TABLE "atacado_produtos"
ADD COLUMN IF NOT EXISTS "numeracao" TEXT,
ADD COLUMN IF NOT EXISTS "embalagem" TEXT;
