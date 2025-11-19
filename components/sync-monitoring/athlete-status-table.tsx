"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AthleteStatus {
  id: string
  fullName: string
  email: string
  lastSyncAt: string | null
  syncStatus: "success" | "failed" | "never"
  cyclesCount: number
  sleepCount: number
  workoutsCount: number
  platform: string
}

interface AthleteStatusTableProps {
  athletes: AthleteStatus[]
  onForceSync?: (userId: string) => void
  loading?: boolean
}

export function AthleteStatusTable({ athletes, onForceSync, loading }: AthleteStatusTableProps) {
  const [syncingUsers, setSyncingUsers] = useState<Set<string>>(new Set())

  const handleForceSync = async (userId: string) => {
    setSyncingUsers((prev) => new Set(prev).add(userId))
    try {
      await onForceSync?.(userId)
    } finally {
      setSyncingUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Carregando atletas...</div>
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Nenhum atleta encontrado</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atleta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última Sync</TableHead>
              <TableHead className="text-right">Recovery</TableHead>
              <TableHead className="text-right">Sleep</TableHead>
              <TableHead className="text-right">Workouts</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.map((athlete) => {
              const needsReconnection =
                athlete.syncStatus === "failed" &&
                athlete.cyclesCount === 0 &&
                athlete.sleepCount === 0 &&
                athlete.workoutsCount === 0

              return (
                <TableRow key={athlete.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{athlete.fullName}</div>
                      <div className="text-sm text-muted-foreground">{athlete.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          athlete.syncStatus === "success"
                            ? "default"
                            : athlete.syncStatus === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {athlete.syncStatus === "success"
                          ? "Sucesso"
                          : athlete.syncStatus === "failed"
                            ? "Falhou"
                            : "Nunca"}
                      </Badge>
                      {needsReconnection && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reconexão necessária</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {athlete.lastSyncAt
                      ? formatDistanceToNow(new Date(athlete.lastSyncAt), { addSuffix: true, locale: ptBR })
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">{athlete.cyclesCount}</TableCell>
                  <TableCell className="text-right">{athlete.sleepCount}</TableCell>
                  <TableCell className="text-right">{athlete.workoutsCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleForceSync(athlete.id)}
                      disabled={syncingUsers.has(athlete.id)}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncingUsers.has(athlete.id) ? "animate-spin" : ""}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
