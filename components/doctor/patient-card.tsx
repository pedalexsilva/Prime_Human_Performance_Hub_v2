import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Heart, Moon, Zap, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PatientCardProps {
  id: string
  name: string
  lastSync?: string | null
  recovery?: number | null
  sleep?: number | null
  strain?: number | null
  hasAlerts?: boolean
  alertCount?: number
}

export function PatientCard({
  id,
  name,
  lastSync,
  recovery,
  sleep,
  strain,
  hasAlerts,
  alertCount = 0,
}: PatientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link href={`/doctor/patients/${id}`}>
      <Card className="bg-surface border-border hover:border-primary/50 transition-all cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-primary/20 border border-primary/50">
                <AvatarFallback className="text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{name}</h3>
                {lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização: {new Date(lastSync).toLocaleDateString("pt-PT")}
                  </p>
                )}
              </div>
            </div>
            {hasAlerts && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {alertCount}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/50">
              <Heart className="h-4 w-4 text-primary mb-1" />
              <span
                className={cn(
                  "text-lg font-bold",
                  recovery != null && recovery < 33
                    ? "text-critical"
                    : recovery != null && recovery < 67
                      ? "text-warning"
                      : "text-success",
                )}
              >
                {recovery?.toFixed(0) || "--"}
              </span>
              <span className="text-xs text-muted-foreground">Recovery</span>
            </div>

            <div className="flex flex-col items-center p-3 rounded-lg bg-background/50">
              <Moon className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold">{sleep ? (sleep / 60).toFixed(1) : "--"}</span>
              <span className="text-xs text-muted-foreground">Sono (h)</span>
            </div>

            <div className="flex flex-col items-center p-3 rounded-lg bg-background/50">
              <Zap className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold">{strain?.toFixed(1) || "--"}</span>
              <span className="text-xs text-muted-foreground">Strain</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
