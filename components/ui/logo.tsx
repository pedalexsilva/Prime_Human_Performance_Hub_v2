import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

const sizeClasses = {
  small: "h-8 w-auto",
  medium: "h-12 w-auto",
  large: "h-16 md:h-20 w-auto",
}

export function Logo({ size = "medium", className }: LogoProps) {
  return (
    <Image
      src="/logo-prime-hp.png"
      alt="Prime Human Performance"
      width={400}
      height={100}
      className={cn(sizeClasses[size], className)}
      priority
    />
  )
}
