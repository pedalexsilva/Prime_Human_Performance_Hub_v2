'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/lib/i18n/use-translation'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation() // FIXED: Destructure t from the hook
  
  const handleSync = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/sync/whoop/manual', {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: t('dashboard.syncSuccess'),
          description: `${result.cyclesCount || 0} recovery, ${result.sleepCount || 0} sleep, ${result.workoutsCount || 0} workouts`,
        })
        
        // Reload page to show new data
        window.location.reload()
      } else {
        toast({
          title: t('dashboard.syncError'),
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t('dashboard.syncError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Button 
      onClick={handleSync} 
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? t('dashboard.syncing') : t('dashboard.syncWhoop')}
    </Button>
  )
}
