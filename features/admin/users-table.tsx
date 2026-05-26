"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  createdAt: string;
  lastLoginAt: string;
};

const columns: ColumnDef<UserRow>[] = [
  { accessorKey: "createdAt", header: "Criado em" },
  { accessorKey: "lastLoginAt", header: "Ultimo login" },
  { accessorKey: "name", header: "Nome" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "roles",
    header: "Cargos",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.roles.map((role) => (
          <Badge key={role}>{role}</Badge>
        ))}
      </div>
    )
  },
  { accessorKey: "status", header: "Status" }
];

export function UsersTable({ data }: { data: UserRow[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
