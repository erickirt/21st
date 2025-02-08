import React from "react"
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"
import { PublishTemplateForm } from "@/components/features/publish/template/publish-template-form"
import Head from "next/head"
import { HeaderServer } from "@/components/ui/header"

export const metadata = {
  title: "Publish New Template",
  description: "Create and publish a new template",
}

export default function PublishTemplatePage() {
  return (
    <>
      <Head>
        <title>Publish New Template | 21st.dev</title>
      </Head>
      <SignedIn>
        <header className="flex fixed top-0 left-0 right-0 h-14 z-30 items-center px-4 py-3 text-foreground border-b border-border/40 bg-background">
          <HeaderServer text="Publish template" />
        </header>
        <div className="flex flex-row items-center h-screen w-full">
          <PublishTemplateForm />
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
