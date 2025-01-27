"use client"

import { useRef, useState, useCallback } from "react"
import { Component, User, DemoWithComponent } from "../../../types/global"

const videoLoadingCache = new Map<string, boolean>()
const videoLoadPromises = new Map<string, Promise<void>>()

interface ComponentVideoPreviewProps {
  component: DemoWithComponent | (Component & { user: User })
  demo?: DemoWithComponent | (Component & { user: User })
}

export function ComponentVideoPreview({
  component,
  demo,
}: ComponentVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  const isDemo = "component" in component
  const id = isDemo ? component.id : component.id
  const videoUrl = isDemo
    ? component.video_url
    : (component as Component & { user: User }).video_url

  const toggleVideoIcon = useCallback(
    (hide: boolean) => {
      const videoIcon = document.querySelector(
        `[data-video-icon="${id}"]`,
      ) as HTMLElement
      if (videoIcon) {
        videoIcon.style.opacity = hide ? "0" : "1"
        videoIcon.style.visibility = hide ? "hidden" : "visible"
      }
    },
    [id],
  )

  const loadVideo = useCallback(async () => {
    const videoElement = videoRef.current
    if (!videoElement || !videoUrl) return

    if (videoLoadPromises.has(videoUrl)) {
      try {
        await videoLoadPromises.get(videoUrl)
        if (videoLoadingCache.get(videoUrl)) {
          videoElement.currentTime = 0
          videoElement.play().catch(() => {})
        }
      } catch (error) {
        console.error("Error loading video:", error)
      }
      return
    }

    if (!isVideoLoaded && !videoLoadingCache.get(videoUrl)) {
      const loadPromise = new Promise<void>((resolve, reject) => {
        const handleLoad = () => {
          videoElement
            .play()
            .then(() => {
              setIsVideoLoaded(true)
              videoLoadingCache.set(videoUrl, true)
              resolve()
            })
            .catch(reject)
        }

        videoElement.addEventListener("loadeddata", handleLoad, { once: true })
        videoElement.src = videoUrl
        videoElement.load()
      })

      videoLoadPromises.set(videoUrl, loadPromise)

      try {
        await loadPromise
      } catch (error) {
        console.error("Error loading video:", error)
        videoLoadingCache.set(videoUrl, false)
      } finally {
        videoLoadPromises.delete(videoUrl)
      }
    } else if (isVideoLoaded) {
      videoElement.currentTime = 0
      videoElement.play().catch(() => {})
    }
  }, [videoUrl, isVideoLoaded])

  const playVideo = useCallback(() => {
    toggleVideoIcon(true)
    loadVideo()
  }, [toggleVideoIcon, loadVideo])

  const stopVideo = useCallback(() => {
    toggleVideoIcon(false)
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.pause()
    }
  }, [toggleVideoIcon])

  return (
    <div
      onMouseEnter={playVideo}
      onMouseLeave={stopVideo}
      onTouchStart={playVideo}
      onTouchEnd={stopVideo}
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden"
    >
      <video
        ref={videoRef}
        data-video={`${id}`}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="absolute"
        style={{
          objectFit: "cover",
          display: "block",
          width: "calc(100% + 2px)",
          height: "calc(100% + 2px)",
          left: "-1px",
          top: "-1px",
        }}
      />
    </div>
  )
}
