// components/athlete/user-avatar.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
import { Camera, Upload } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UserAvatarProps {
  avatarUrl?: string | null
  fullName?: string | null
  userId: string
  size?: "sm" | "md" | "lg"
  editable?: boolean
}

export function UserAvatar({ 
  avatarUrl, 
  fullName, 
  userId,
  size = "md",
  editable = false 
}: UserAvatarProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [open, setOpen] = useState(false)
  const supabase = createBrowserClient()

  // Get initials from full name
  const getInitials = (name?: string | null): string => {
    if (!name) return "?"
    
    const parts = name.trim().split(" ")
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Size classes
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-12 w-12 text-lg",
    lg: "h-20 w-20 text-2xl"
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo: 2MB')
      return
    }

    setIsUploading(true)

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      console.log('[Avatar] Uploading file:', filePath)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('[Avatar] Upload error:', uploadError)
        throw uploadError
      }

      console.log('[Avatar] Upload success:', uploadData)

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      console.log('[Avatar] Public URL:', publicUrl)

      // 3. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        console.error('[Avatar] Update profile error:', updateError)
        throw updateError
      }

      console.log('[Avatar] Profile updated successfully')

      // 4. Update local state
      setCurrentAvatar(publicUrl)
      setOpen(false)

      // Optional: Refresh page to update all instances
      // window.location.reload()

    } catch (error) {
      console.error('[Avatar] Error uploading avatar:', error)
      alert('Erro ao fazer upload da foto. Tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }

  const avatarContent = currentAvatar ? (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-muted`}>
      <Image
        src={currentAvatar}
        alt={fullName || "User avatar"}
        fill
        className="object-cover"
        sizes={size === "lg" ? "80px" : size === "md" ? "48px" : "32px"}
      />
    </div>
  ) : (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        bg-gradient-to-br from-blue-500 to-purple-600
        flex items-center justify-center
        font-semibold text-white
        select-none
      `}
    >
      {getInitials(fullName)}
    </div>
  )

  if (!editable) {
    return avatarContent
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="relative group cursor-pointer"
          type="button"
        >
          {avatarContent}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Foto de Perfil</DialogTitle>
          <DialogDescription>
            Escolha uma foto para o seu perfil. Formatos aceites: JPG, PNG, GIF. Tamanho máximo: 2MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            {currentAvatar ? (
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted">
                <Image
                  src={currentAvatar}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-semibold text-white text-4xl">
                {getInitials(fullName)}
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  A fazer upload...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Foto
                </>
              )}
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
