"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Container } from "@/components/ui/container"
import { useAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { useSidebarHotkey } from "@/hooks/use-sidebar-hotkey"

export const sidebarOpenAtom = atomWithStorage<boolean>("sidebar:state", false)
export const sidebarHintDismissedAtom = atomWithStorage<boolean>(
  "sidebar:hint-dismissed",
  false,
)

export function MainLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [open] = useAtom(sidebarOpenAtom)
  useSidebarHotkey()

  return (
    <main className={cn("min-h-screen w-full", className)}>
      <Container>{children}</Container>
    </main>
  )
}
