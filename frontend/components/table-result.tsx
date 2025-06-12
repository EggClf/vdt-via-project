import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  data: {
    title?: string;
    columns: string[];
    records: Record<string, any>[];
  };
}

export function DataTable({ data }: DataTableProps) {
  const { title, columns, records } = data;

  if (!columns || !records || columns.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">No data available</div>
    );
  }

  return (
    <div className="overflow-auto max-w-full">
      <div className="rounded-md border min-w-full inline-block">
        <Table>
          {title && <TableCaption>{title}</TableCaption>}
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className="whitespace-nowrap px-4">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className="px-4">
                    {record[column] !== undefined ? String(record[column]) : ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


