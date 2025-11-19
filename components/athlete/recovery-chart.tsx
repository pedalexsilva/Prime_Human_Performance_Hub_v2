"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ChartData {
  date: string
  recovery: number | null
  hrv: number | null
  strain: number | null
}

interface RecoveryChartProps {
  data: ChartData[]
  title?: string
  description?: string
}

export function RecoveryChart({ data, title = "Tendências (30 dias)", description }: RecoveryChartProps) {
  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(196, 154, 108, 0.1)" />
            <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
            <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1B2A3D",
                border: "1px solid rgba(196, 154, 108, 0.2)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="recovery"
              stroke="#C49A6C"
              strokeWidth={2}
              name="Recuperação"
              dot={{ fill: "#C49A6C" }}
            />
            <Line type="monotone" dataKey="hrv" stroke="#3B82F6" strokeWidth={2} name="HRV" dot={{ fill: "#3B82F6" }} />
            <Line
              type="monotone"
              dataKey="strain"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Strain"
              dot={{ fill: "#F59E0B" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
