import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente do arquivo .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const prisma = new PrismaClient();

async function clearAtacadoData() {
  console.log('Limpando dados do módulo atacado...');

  try {
    // 1. Limpar tabelas dependentes (começando pelas que têm mais dependências)
    console.log('  → Limpando atacado_carteira_movimentos...');
    await prisma.atacadoCarteiraMovimento.deleteMany({});

    console.log('  → Limpando atacado_carteiras_clientes...');
    await prisma.atacadoCarteiraCliente.deleteMany({});

    console.log('  → Limpando atacado_historico_status...');
    await prisma.atacadoHistoricoStatus.deleteMany({});

    console.log('  → Limpando atacado_assinaturas...');
    await prisma.atacadoAssinatura.deleteMany({});

    console.log('  → Limpando atacado_entregas...');
    await prisma.atacadoEntrega.deleteMany({});

    console.log('  → Limpando atacado_pagamentos...');
    await prisma.atacadoPagamento.deleteMany({});

    console.log('  → Limpando atacado_anexos...');
    await prisma.atacadoAnexo.deleteMany({});

    console.log('  → Limpando atacado_pedido_itens...');
    await prisma.atacadoPedidoItem.deleteMany({});

    console.log('  → Limpando atacado_pedidos...');
    await prisma.atacadoPedido.deleteMany({});

    console.log('  → Limpando atacado_produto_fotos...');
    await prisma.atacadoProdutoFoto.deleteMany({});

    console.log('  → Limpando atacado_produtos...');
    await prisma.atacadoProduto.deleteMany({});

    console.log('  → Limpando atacado_clientes...');
    await prisma.atacadoCliente.deleteMany({});

    console.log('\n✅ Dados do módulo atacado limpos com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao limpar dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAtacadoData();
