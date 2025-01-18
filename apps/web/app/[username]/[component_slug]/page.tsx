import React from "react"
import { notFound, redirect } from "next/navigation"
import dynamic from "next/dynamic"
import ErrorPage from "@/components/ui/error-page"
import {
  getComponent,
  getComponentDemos,
  getComponentWithDemo,
  getUserData,
} from "@/lib/queries"
import { resolveRegistryDependencyTree } from "@/lib/queries.server"
import { extractDemoComponentNames } from "@/lib/parsers"
import { supabaseWithAdminAccess } from "@/lib/supabase"
import { validateRouteParams } from "@/lib/utils/validateRouteParams"

const ComponentPage = dynamic(
  () => import("@/components/features/component-page/component-page-layout"),
  {
    ssr: false,
  },
)

export const generateMetadata = async ({
  params,
}: {
  params: { username: string; component_slug: string }
}) => {
  const { data: component } = await getComponent(
    supabaseWithAdminAccess,
    params.username,
    params.component_slug,
  )
  const { data: user } = await getUserData(
    supabaseWithAdminAccess,
    params.username,
  )

  if (!component || !user) {
    return {
      title: "Component Not Found",
    }
  }

  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${user.username}/${component.component_slug}/opengraph-image`

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: component.name,
    description: component.description,
    programmingLanguage: {
      "@type": "ComputerLanguage",
      name: "React",
    },
    author: {
      "@type": "Person",
      name: user.username,
    },
    dateCreated: component.created_at,
    license: component.license,
  }

  return {
    metadataBase: new URL("https://21st.dev"),
    title: `${component.name} | 21st.dev - The NPM for Design Engineers`,
    description:
      component.description ||
      `A React component by ${user.username}. Ship polished UIs faster with ready-to-use Tailwind components inspired by shadcn/ui.`,
    keywords: [
      "react components",
      "design engineers",
      "tailwind css",
      "ui components",
      "shadcn/ui",
      "component library",
      `${component.name.toLowerCase()} component`,
      `${component.name.toLowerCase()} shadcn/ui`,
      ...(component.tags?.map((tag) => tag.name.toLowerCase()) || []),
    ],
    openGraph: {
      title: `${component.name} | 21st.dev - The NPM for Design Engineers`,
      description:
        component.description ||
        `A React component by ${user.username}. Ship polished UIs faster with ready-to-use Tailwind components inspired by shadcn/ui.`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Preview of ${component.name} component`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${component.name} | 21st.dev - The NPM for Design Engineers`,
      description:
        component.description ||
        `A React component by ${user.username}. Ship polished UIs faster with ready-to-use Tailwind components inspired by shadcn/ui.`,
      images: [ogImageUrl],
    },
    other: {
      "script:ld+json": JSON.stringify(structuredData),
    },
  }
}

const fetchFileTextContent = async (url: string) => {
  const filename = url.split("/").slice(-1)[0]
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Error response in fetching file ${filename}`, response)
      throw new Error(
        `Error response in fetching file ${filename}: ${response.statusText}`,
      )
    }
    return { data: await response.text(), error: null }
  } catch (err) {
    console.error(`Failed to fetch file ${filename}`, err)
    return {
      error: new Error(`Failed to fetch file ${filename}: ${err}`),
      data: null,
    }
  }
}

export default async function ComponentPageServer({
  params,
}: {
  params: { username: string; component_slug: string; demo_slug?: string }
}) {
  if (!validateRouteParams(params)) {
    redirect("/")
  }

  const demo_slug = params.demo_slug || "default"

  try {
    const { data, error, shouldRedirectToDefault } = await getComponentWithDemo(
      supabaseWithAdminAccess,
      params.username,
      params.component_slug,
      demo_slug,
    )

    if (shouldRedirectToDefault || error || !data) {
      return redirect("/")
    }

    const { component, demo } = data

    const { data: componentDemos, error: demosError } = await getComponentDemos(
      supabaseWithAdminAccess,
      component.id,
    )

    const dependencies = (component.dependencies ?? {}) as Record<
      string,
      string
    >
    const demoDependencies = (demo.demo_dependencies ?? {}) as Record<
      string,
      string
    >

    const componentAndDemoCodePromises = [
      fetchFileTextContent(component.code),
      fetchFileTextContent(demo.demo_code),
      component.tailwind_config_extension
        ? fetchFileTextContent(component.tailwind_config_extension)
        : Promise.resolve({ data: null, error: null }),
      component.global_css_extension
        ? fetchFileTextContent(component.global_css_extension)
        : Promise.resolve({ data: null, error: null }),
      demo.compiled_css
        ? fetchFileTextContent(demo.compiled_css)
        : Promise.resolve({ data: null, error: null }),
    ]

    const demoRegistryDeps = Array.isArray(
      demo.demo_direct_registry_dependencies,
    )
      ? demo.demo_direct_registry_dependencies.filter(
          (dep): dep is string => typeof dep === "string",
        )
      : []

    const [
      codeResult,
      demoResult,
      tailwindConfigResult,
      globalCssResult,
      compiledCssResult,
      registryDependenciesResult,
    ] = await Promise.all([
      ...componentAndDemoCodePromises,
      resolveRegistryDependencyTree({
        supabase: supabaseWithAdminAccess,
        sourceDependencySlugs: [
          `${params.username}/${params.component_slug}`,
          ...demoRegistryDeps,
        ],
        withDemoDependencies: true,
      }),
    ])

    if (
      codeResult?.error ||
      demoResult?.error ||
      tailwindConfigResult?.error ||
      globalCssResult?.error ||
      compiledCssResult?.error
    ) {
      return (
        <ErrorPage
          error={
            codeResult?.error ??
            demoResult?.error ??
            tailwindConfigResult?.error ??
            globalCssResult?.error ??
            compiledCssResult?.error ??
            new Error("Unknown error")
          }
        />
      )
    }
    if (registryDependenciesResult?.error) {
      return (
        <ErrorPage
          error={registryDependenciesResult.error ?? new Error("Unknown error")}
        />
      )
    }

    const registryDependenciesData = registryDependenciesResult?.data as {
      filesWithRegistry: Record<string, { code: string; registry: string }>
      npmDependencies: Record<string, string>
    }

    const registryDependenciesFiles = Object.fromEntries(
      Object.entries(registryDependenciesData.filesWithRegistry).map(
        ([key, value]) => [key, value.code],
      ),
    )
    const demoComponentNames = extractDemoComponentNames(
      demoResult?.data as string,
    )

    return (
      <div className="w-full px-4">
        <ComponentPage
          component={component}
          demo={demo}
          componentDemos={componentDemos}
          code={codeResult?.data as string}
          demoCode={demoResult?.data as string}
          dependencies={dependencies}
          demoDependencies={demoDependencies}
          demoComponentNames={demoComponentNames}
          registryDependencies={registryDependenciesFiles}
          npmDependenciesOfRegistryDependencies={
            registryDependenciesData.npmDependencies
          }
          tailwindConfig={tailwindConfigResult?.data as string}
          globalCss={globalCssResult?.data as string}
          compiledCss={compiledCssResult?.data as string}
          submission={data.submission ?? undefined}
        />
      </div>
    )
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Error loading component:", error)
    return notFound()
  }
}
