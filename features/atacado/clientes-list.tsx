"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AtacadoStatusBadge } from "@/features/atacado/status";

const PAGE_SIZE = 20;

type ClienteRow = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  documento: string | null;
  status: string;
};

type ClientesPageResult = {
  clientes: ClienteRow[];
  hasMore: boolean;
  page: number;
  take: number;
};

type ClientesListProps = {
  initialClientes: ClienteRow[];
  initialHasMore: boolean;
  initialQuery: string;
  canEditClientes: boolean;
};

export function ClientesList({ initialClientes, initialHasMore, initialQuery, canEditClientes }: ClientesListProps) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [clientes, setClientes] = useState(initialClientes);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(initialHasMore ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(page);
  const hasMoreRef = useRef(initialHasMore);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  async function fetchPage(search: string, pageNumber: number) {
    const url = new URL("/api/atacado/clientes", window.location.origin);
    if (search) {
      url.searchParams.set("q", search);
    }
    url.searchParams.set("page", String(pageNumber));
    url.searchParams.set("take", String(PAGE_SIZE));

    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => null) as { ok?: boolean; data?: ClientesPageResult; error?: { message?: string } } | null;

    if (!response.ok || !payload?.ok || !payload.data) {
      throw new Error(payload?.error?.message ?? "Nao foi possivel carregar os clientes.");
    }

    return payload.data;
  }

  async function loadFirstPage(nextQuery: string) {
    if (loadingRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage(nextQuery, 1);
      setClientes(result.clientes);
      setHasMore(result.hasMore);
      setPage(result.hasMore ? 2 : 1);
      setQuery(nextQuery);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Nao foi possivel carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingRef.current || !hasMoreRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage(query, pageRef.current);
      setClientes((current) => [...current, ...result.clientes]);
      setHasMore(result.hasMore);
      setPage((current) => current + 1);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Nao foi possivel carregar mais clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query, page, hasMore]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadFirstPage(queryInput.trim());
  }

  function handleClear() {
    setQueryInput("");
    void loadFirstPage("");
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="sticky top-0 z-10 border-b bg-card/95 p-4 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Buscar por nome, cidade, telefone ou documento"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              Buscar
            </Button>
            <Button type="button" variant="outline" onClick={handleClear} disabled={loading && !queryInput}>
              Limpar
            </Button>
          </div>
        </form>
        <div className="mt-2 text-xs text-muted-foreground">
          {query ? `Mostrando resultados para "${query}".` : "Mostrando todos os clientes."}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-semibold">{cliente.nome}</TableCell>
                <TableCell>{[cliente.cidade, cliente.estado].filter(Boolean).join(" / ") || "-"}</TableCell>
                <TableCell>{cliente.telefone ?? "-"}</TableCell>
                <TableCell>{cliente.documento ?? "-"}</TableCell>
                <TableCell><AtacadoStatusBadge status={cliente.status} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {canEditClientes ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/atacado/clientes/${cliente.id}/editar`}>Editar</Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/atacado/clientes/${cliente.id}/carteira`}>Carteira</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!clientes.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div ref={sentinelRef} className="h-6" />
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        {loading ? "Carregando..." : hasMore ? "Role para carregar mais clientes." : "Fim da lista."}
      </div>
      {error ? <div className="px-4 pb-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
    </div>
  );
}
