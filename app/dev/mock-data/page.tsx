"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MOCK_ATHLETES, getAthleteData, getAthleteSummary } from "@/lib/mock-data"
import { detectAlerts } from "@/lib/alerts"
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"

export default function MockDataViewerPage() {
  const [selectedAthleteId, setSelectedAthleteId] = useState<number>(1)

  const athleteData = useMemo(() => getAthleteData(selectedAthleteId), [selectedAthleteId])
  const summary = useMemo(() => getAthleteSummary(selectedAthleteId, 7), [selectedAthleteId])
  const alerts = useMemo(() => detectAlerts(athleteData), [athleteData])

  const selectedAthlete = MOCK_ATHLETES.find((a) => a.id === selectedAthleteId)

  const getTrendIcon = (value: number | undefined) => {
    if (!value) return <Minus className="h-4 w-4 text-muted-foreground" />
    if (value > 5) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (value < -5) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "warning":
        return "default"
      case "info":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mock Data Viewer</h1>
        <p className="text-muted-foreground">Visualize os dados mock gerados para desenvolvimento</p>
      </div>

      {/* Athlete Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Atleta</CardTitle>
          <CardDescription>Escolha um atleta para ver os seus dados mock</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAthleteId.toString()} onValueChange={(v) => setSelectedAthleteId(Number(v))}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_ATHLETES.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id.toString()}>
                  {athlete.name} - {athlete.team}{" "}
                  <span className="text-muted-foreground text-xs">({athlete.profile_type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAthlete && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Perfil:</strong> {selectedAthlete.profile_type}
              </p>
              <p className="text-sm">
                <strong>Equipa:</strong> {selectedAthlete.team}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recovery Média (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_recovery.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Strain Médio (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_strain.toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sono Médio (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_sleep.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">HRV Média (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_hrv.toFixed(0)} ms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Detectados ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">Nenhum alerta detectado para este atleta.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-sm text-muted-foreground mt-1">{alert.recommendation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Diários (14 dias)</CardTitle>
          <CardDescription>Métricas base e derivadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Strain</TableHead>
                  <TableHead className="text-right">Recovery</TableHead>
                  <TableHead className="text-right">Sono</TableHead>
                  <TableHead className="text-right">HRV</TableHead>
                  <TableHead className="text-right">RHR</TableHead>
                  <TableHead className="text-right">Recovery Trend 3d</TableHead>
                  <TableHead className="text-right">Strain Load 7d</TableHead>
                  <TableHead className="text-right">Sleep Consistency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athleteData.map((metric, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">
                      {new Date(metric.date).toLocaleDateString("pt-PT")}
                    </TableCell>
                    <TableCell className="text-right font-medium">{metric.strain.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-medium">{metric.recovery.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium">{metric.sleep_performance.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium">{metric.hrv.toFixed(0)} ms</TableCell>
                    <TableCell className="text-right">{metric.resting_heart_rate.toFixed(0)} bpm</TableCell>
                    <TableCell className="text-right">
                      {metric.recovery_trend_3d !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(metric.recovery_trend_3d)}
                          <span className="text-xs">{metric.recovery_trend_3d.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.strain_load_7d !== undefined ? (
                        <span className="text-xs">{metric.strain_load_7d.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.sleep_consistency !== undefined ? (
                        <span className="text-xs">{metric.sleep_consistency.toFixed(0)}%</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
