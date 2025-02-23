import React from "react"
import { Metadata } from "next"
import { cookies } from "next/headers"

import {
  Component,
  QuickFilterOption,
  SortOption,
  User,
  DemoWithComponent,
} from "@/types/global"

import { supabaseWithAdminAccess } from "@/lib/supabase"

import { Header } from "../components/Header"
import { HeroSection } from "@/components/HeroSection"
import { NewsletterDialog } from "@/components/NewsletterDialog"
import { HomePageClient } from "./page.client"

export const dynamic = "force-dynamic"

export const generateMetadata = async (): Promise<Metadata> => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "21st.dev - The NPM for Design Engineers",
    description:
      "Ship polished UIs faster with ready-to-use React Tailwind components inspired by shadcn/ui. Built by design engineers, for design engineers.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/s/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return {
    title: "21st.dev – The NPM for Design Engineers",
    description:
      "Ship polished UIs faster with ready-to-use React Tailwind components inspired by shadcn/ui. Built by design engineers, for design engineers.",
    keywords: [
      "react components",
      "tailwind css",
      "ui components",
      "design engineers",
      "component library",
      "shadcn ui",
      "publish components",
    ],
    openGraph: {
      title: "21st.dev - The NPM for Design Engineers",
      description:
        "Ship polished UIs faster with ready-to-use React Tailwind components inspired by shadcn/ui. Built by design engineers, for design engineers.",
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "21st.dev - The NPM for Design Engineers",
      description:
        "Ship polished UIs faster with ready-to-use React Tailwind components inspired by shadcn/ui. Built by design engineers, for design engineers.",
      images: [`${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`],
    },
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  }
}

export default async function HomePage() {
  const cookieStore = cookies()
  const shouldShowHero = !cookieStore.has("has_visited")
  const hasOnboarded = cookieStore.has("has_onboarded")
  const savedSortBy = cookieStore.get("saved_sort_by")?.value as
    | SortOption
    | undefined
  const savedQuickFilter = cookieStore.get("saved_quick_filter")?.value as
    | QuickFilterOption
    | undefined

  const defaultQuickFilter = savedQuickFilter || "all"
  const defaultSortBy: SortOption = savedSortBy || "downloads"

  const sortByPreference: SortOption = savedSortBy?.length
    ? (savedSortBy as SortOption)
    : defaultSortBy
  const quickFilterPreference: QuickFilterOption = savedQuickFilter?.length
    ? (savedQuickFilter as QuickFilterOption)
    : defaultQuickFilter

  const orderByFields: [string, string] = (() => {
    switch (sortByPreference) {
      case "downloads":
        return ["component(downloads_count)", "desc"]
      case "likes":
        return ["component(likes_count)", "desc"]
      case "date":
        return ["created_at", "desc"]
    }
  })()

  const { data: initialDemos, error: demosError } =
    await supabaseWithAdminAccess
      .from("demos")
      .select(
        "*, component:components!demos_component_id_fkey(*, user:users!user_id(*))",
      )
      .limit(40)
      .eq("component.is_public", true)
      .order(orderByFields[0], { ascending: orderByFields[1] === "desc" })
      .returns<DemoWithComponent[]>()

  if (demosError) {
    console.error("Demos error:", demosError)
    return null
  }

  const filteredDemos = await supabaseWithAdminAccess.rpc(
    "get_filtered_demos",
    {
      p_quick_filter: quickFilterPreference,
      p_sort_by: sortByPreference,
      p_offset: 0,
      p_limit: 40,
    },
  )

  if (filteredDemos.error) {
    console.error("Filtered demos error:", filteredDemos.error)
    return null
  }

  const initialFilteredSortedDemos = (filteredDemos.data || []).map(
    (result) => ({
      id: result.id,
      name: result.name,
      demo_code: result.demo_code,
      preview_url: result.preview_url,
      video_url: result.video_url,
      compiled_css: result.compiled_css,
      demo_dependencies: result.demo_dependencies,
      demo_direct_registry_dependencies:
        result.demo_direct_registry_dependencies,
      demo_slug: result.demo_slug,
      component: {
        ...(result.component_data as Component),
        user: result.user_data,
      } as Component & { user: User },
      created_at: result.created_at,
      updated_at: result.updated_at,
    }),
  ) as DemoWithComponent[]

  const { data: initialTabsCountsData, error: initialTabsCountsError } =
    await supabaseWithAdminAccess.rpc("get_components_counts")

  const initialTabsCounts =
    !initialTabsCountsError && Array.isArray(initialTabsCountsData)
      ? initialTabsCountsData.reduce(
          (acc, item) => {
            acc[item.filter_type as QuickFilterOption] = item.count
            return acc
          },
          {} as Record<QuickFilterOption, number>,
        )
      : {
          all: 0,
          last_released: 0,
          most_downloaded: 0,
        }

  if (shouldShowHero) {
    return (
      <>
        <HeroSection />
        <NewsletterDialog />
      </>
    )
  }

  return (
    <>
      <Header variant="default" />
      <HomePageClient
        initialComponents={initialFilteredSortedDemos}
        initialSortBy={sortByPreference}
        initialQuickFilter={quickFilterPreference}
        initialTabsCounts={initialTabsCounts}
      />
      <NewsletterDialog />
    </>
  )
}
