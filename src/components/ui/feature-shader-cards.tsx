"use client"

import type React from "react"

import { Warp } from "@paper-design/shaders-react"

interface Feature {
  title: string
  description: string
  icon: React.ReactNode
}

const features: Feature[] = [
  {
    title: "Set up your profile",
    description:
      "Choose your games, add your platform IDs, and keep one clean profile ready for queues, challenges, and tournaments.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 6h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-1.5l-2.2 2.2a1 1 0 0 1-1.6-.33L10.96 18H7a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4zm1.5 4A1.5 1.5 0 1 0 10 11.5 1.5 1.5 0 0 0 8.5 10zm5 0a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5z" />
      </svg>
    ),
  },
  {
    title: "Join live queues",
    description:
      "Jump into ranked matchmaking fast, see who is active, and stop chasing opponents across scattered chats.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 2 5 14h5l-1 8 8-12h-5l1-8z" />
      </svg>
    ),
  },
  {
    title: "Send direct challenges",
    description:
      "Call out players from the leaderboard or their profile when you want the exact matchup on your terms.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="m21.71 20.29-3.4-3.4a7 7 0 0 0-.7-8.9l-1.42 1.42a5 5 0 0 1 .32 6.72l-2.12-2.12-1.41 1.41 2.12 2.12a5 5 0 0 1-6.72-.32L6.97 18.64a7 7 0 0 0 8.9.7l3.4 3.4a1 1 0 0 0 1.42-1.42ZM7.8 7.8l1.06-1.06 2.12 2.12 1.41-1.41L10.27 5.3l1.06-1.06A7 7 0 0 0 2.9 2.9L5.3 5.3 3.88 6.72 1.47 4.3A7 7 0 0 0 4.24 11.33L7.8 7.8Z" />
      </svg>
    ),
  },
  {
    title: "Create tournaments",
    description:
      "Run free or paid brackets, keep entries visible, and move rounds forward without the usual manual confusion.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 4h-3V2H8v2H5a1 1 0 0 0-1 1v2a5 5 0 0 0 4 4.9A6 6 0 0 0 11 15.92V18H8v2h8v-2h-3v-2.08A6 6 0 0 0 16 11.9 5 5 0 0 0 20 7V5a1 1 0 0 0-1-1ZM6 7V6h2v3.82A3 3 0 0 1 6 7Zm12 0a3 3 0 0 1-2 2.82V6h2Z" />
      </svg>
    ),
  },
  {
    title: "Report results clearly",
    description:
      "Confirm scorelines, surface disputes early, and feed every completed match back into the right ladder.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2 4 5v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V5Zm-1.2 14.4-3.2-3.2L9 11.8l1.8 1.8 4.2-4.2 1.4 1.4Z" />
      </svg>
    ),
  },
  {
    title: "Keep everyone updated",
    description:
      "Players see what changed next through cleaner status updates and notifications instead of guessing in chat.",
    icon: (
      <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1Z" />
      </svg>
    ),
  },
]

export default function FeaturesCards() {
  const getShaderConfig = (index: number) => {
    const configs = [
      {
        proportion: 0.3,
        softness: 0.8,
        distortion: 0.15,
        swirl: 0.6,
        swirlIterations: 8,
        shape: "checks" as const,
        shapeScale: 0.08,
        colors: ["hsl(280, 100%, 30%)", "hsl(320, 100%, 60%)", "hsl(340, 90%, 40%)", "hsl(300, 100%, 70%)"],
      },
      {
        proportion: 0.4,
        softness: 1.2,
        distortion: 0.2,
        swirl: 0.9,
        swirlIterations: 12,
        shape: "stripes" as const,
        shapeScale: 0.12,
        colors: ["hsl(200, 100%, 25%)", "hsl(180, 100%, 65%)", "hsl(160, 90%, 35%)", "hsl(190, 100%, 75%)"],
      },
      {
        proportion: 0.35,
        softness: 0.9,
        distortion: 0.18,
        swirl: 0.7,
        swirlIterations: 10,
        shape: "checks" as const,
        shapeScale: 0.1,
        colors: ["hsl(120, 100%, 25%)", "hsl(140, 100%, 60%)", "hsl(100, 90%, 30%)", "hsl(130, 100%, 70%)"],
      },
      {
        proportion: 0.45,
        softness: 1.1,
        distortion: 0.22,
        swirl: 0.8,
        swirlIterations: 15,
        shape: "edge" as const,
        shapeScale: 0.09,
        colors: ["hsl(30, 100%, 35%)", "hsl(50, 100%, 65%)", "hsl(40, 90%, 40%)", "hsl(45, 100%, 75%)"],
      },
      {
        proportion: 0.38,
        softness: 0.95,
        distortion: 0.16,
        swirl: 0.85,
        swirlIterations: 11,
        shape: "checks" as const,
        shapeScale: 0.11,
        colors: ["hsl(250, 100%, 30%)", "hsl(270, 100%, 65%)", "hsl(260, 90%, 35%)", "hsl(265, 100%, 70%)"],
      },
      {
        proportion: 0.42,
        softness: 1.0,
        distortion: 0.19,
        swirl: 0.75,
        swirlIterations: 9,
        shape: "stripes" as const,
        shapeScale: 0.13,
        colors: ["hsl(330, 100%, 30%)", "hsl(350, 100%, 60%)", "hsl(340, 90%, 35%)", "hsl(345, 100%, 75%)"],
      },
    ]
    return configs[index % configs.length]
  }

  return (
    <section
      id="how-it-works"
      className="py-14 sm:py-16"
      style={{
        background:
          "radial-gradient(circle at 0% 0%, var(--page-glow-1), transparent 24%), radial-gradient(circle at 100% 0%, var(--page-glow-2), transparent 24%), linear-gradient(180deg, var(--page-bg-alt), var(--page-bg))",
      }}
    >
      <div className="landing-shell">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="mb-4 text-3xl font-light text-[var(--text-primary)] md:text-4xl">How Mechi Works</h2>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Everything you need to queue, challenge, host tournaments, confirm scorelines, and keep players updated in one cleaner flow
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const shaderConfig = getShaderConfig(index)
            return (
              <div key={index} className="relative h-56 sm:h-60">
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <Warp
                    style={{ height: "100%", width: "100%" }}
                    proportion={shaderConfig.proportion}
                    softness={shaderConfig.softness}
                    distortion={shaderConfig.distortion}
                    swirl={shaderConfig.swirl}
                    swirlIterations={shaderConfig.swirlIterations}
                    shape={shaderConfig.shape}
                    shapeScale={shaderConfig.shapeScale}
                    scale={1}
                    rotation={0}
                    speed={0.8}
                    colors={shaderConfig.colors}
                  />
                </div>

                <div className="relative z-10 flex h-full flex-col rounded-3xl border border-white/20 bg-black/80 p-6 dark:border-white/10">
                  <div className="mb-3 scale-[0.72] origin-top-left filter drop-shadow-lg">{feature.icon}</div>

                  <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>

                  <p className="flex-grow text-sm font-medium leading-[1.45] text-gray-100">{feature.description}</p>

                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
