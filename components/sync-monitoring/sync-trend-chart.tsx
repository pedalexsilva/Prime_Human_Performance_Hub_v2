"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface SyncTrendData {
  date: string
  success: number
  failed: number
}

interface SyncTrendChartProps {
  data: SyncTrendData[]
  loading?: boolean
}

export function SyncTrendChart({ data, loading }: SyncTrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sincronizações</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Sincronizações</CardTitle>
        <CardDescription>Sucesso vs Falhas - Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            success: {
              label: "Sucesso",
              color: "hsl(var(--chart-1))",
            },
            failed: {
              label: "Falhas",
              color: "hsl(var(--chart-5))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="success"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorSuccess)"
                name="Sucesso"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stroke="hsl(var(--chart-5))"
                fillOpacity={1}
                fill="url(#colorFailed)"
                name="Falhas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
