"use client"

import { useState, useMemo } from "react"
import { NavHeader } from "@/components/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MOCK_ATHLETES, getAthleteData, getAthleteSummary } from "@/lib/mock-data"
import { detectAlerts } from "@/lib/alerts"
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function DashboardPage() {
  const { t } = useTranslation()
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

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical":
        return t("dashboard.alerts.severity.critical")
      case "warning":
        return t("dashboard.alerts.severity.warning")
      case "info":
        return t("dashboard.alerts.severity.info")
      default:
        return severity
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("dashboard.mockDataViewer.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.mockDataViewer.subtitle")}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("dashboard.mockDataViewer.selectAthlete")}</CardTitle>
            <CardDescription>{t("dashboard.mockDataViewer.selectDescription")}</CardDescription>
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
                  <strong>{t("dashboard.mockDataViewer.profile")}:</strong> {selectedAthlete.profile_type}
                </p>
                <p className="text-sm">
                  <strong>{t("dashboard.mockDataViewer.team")}:</strong> {selectedAthlete.team}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {summary && (
          <div className="grid gap-6 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.mockDataViewer.stats7d.recoveryAvg")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avg_recovery.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.mockDataViewer.stats7d.strainAvg")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avg_strain.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.mockDataViewer.stats7d.sleepAvg")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avg_sleep.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.mockDataViewer.stats7d.hrvAvg")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avg_hrv.toFixed(0)} ms</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("dashboard.mockDataViewer.alertsDetected")} ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-muted-foreground">{t("dashboard.mockDataViewer.noAlerts")}</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Badge variant={getSeverityColor(alert.severity)}>{getSeverityLabel(alert.severity)}</Badge>
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      {alert.recommendation && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>{t("dashboard.alerts.recommendation")}:</strong> {alert.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.mockDataViewer.dailyData")}</CardTitle>
            <CardDescription>{t("dashboard.mockDataViewer.dailyDataDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.mockDataViewer.table.date")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.strain")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.recovery")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.sleep")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.hrv")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.rhr")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.recoveryTrend3d")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.strainLoad7d")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.mockDataViewer.table.sleepConsistency")}</TableHead>
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
      </main>
    </div>
  )
}
