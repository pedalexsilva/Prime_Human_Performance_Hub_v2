"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ErrorLog {
  id: string
  userId: string
  userName: string
  platform: string
  errorMessage: string
  createdAt: string
}

interface ErrorLogsTableProps {
  errors: ErrorLog[]
  loading?: boolean
}

export function ErrorLogsTable({ errors, loading }: ErrorLogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Carregando logs...</div>
      </div>
    )
  }

  if (errors.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Nenhum erro recente encontrado</div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Atleta</TableHead>
            <TableHead>Plataforma</TableHead>
            <TableHead>Quando</TableHead>
            <TableHead>Erro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => (
            <>
              <TableRow key={error.id}>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleRow(error.id)}>
                    {expandedRows.has(error.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{error.userName}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{error.platform}</Badge>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(error.createdAt), { addSuffix: true, locale: ptBR })}
                </TableCell>
                <TableCell className="max-w-md truncate">{error.errorMessage}</TableCell>
              </TableRow>
              {expandedRows.has(error.id) && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-muted/50">
                    <div className="p-4">
                      <h4 className="font-semibold mb-2">Detalhes do Erro</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">ID:</span> {error.id}
                        </div>
                        <div>
                          <span className="font-medium">User ID:</span> {error.userId}
                        </div>
                        <div>
                          <span className="font-medium">Mensagem completa:</span>
                          <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto">
                            {error.errorMessage}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
