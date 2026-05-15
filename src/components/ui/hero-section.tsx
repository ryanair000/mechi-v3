"use client";

import Image from "next/image";
import { useRegionalSettings } from "@/components/RegionalSettingsProvider";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { cn } from "@/lib/utils";
import { WEEKEND_CUP_REGISTRATION_PATH } from "@/lib/weekend-cup";

export const blocksDesign = [
  {
    id: "playmechi-launch",
    name: "PlayMechi Launch",
    url: "/playmechi",
    imgSrc: "/images/playmechi/playmechi-tournament-poster.png",
  },
  {
    id: "weekend-cup",
    name: "Weekend Cup",
    url: "/weekendcup",
    imgSrc: "/images/playmechi/weekend-cup-poster.png",
  },
  {
    id: "weka-mawe-weekly",
    name: "Weka Mawe Weekly",
    url: "/leaderboard",
    imgSrc: "/images/playmechi/weka-mawe-weekly-poster.png",
  },
];

export default function HeroSection() {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === "sw-TZ";

  return (
    <section className="page-base relative overflow-hidden bg-transparent px-4 pb-5 pt-16 text-[var(--text-primary)] sm:pt-20">
      <div className="mx-auto min-h-[60vh] max-w-screen-2xl">
        <article className="mx-auto w-fit max-w-2xl space-y-6 text-center xl:max-w-4xl 2xl:max-w-5xl">
          <TimelineContent
            as="a"
            href={WEEKEND_CUP_REGISTRATION_PATH}
            className="mx-auto flex w-fit items-center gap-1 rounded-full border-4 border-blue-200 bg-blue-600 py-0.5 pl-0.5 pr-3 text-xs"
          >
            <div className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-xs text-[var(--text-primary)]">
              {isSwahili ? "Mpya" : "Latest"}
            </div>
            <p className="inline-block text-xs text-white sm:text-base">
              <span className="px-1 font-semibold">
                {isSwahili ? "Weekend Cup Inaendelea Sasa!" : "Weekend Cup Live Now!"}
              </span>
            </p>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              data-slot="icon"
              className="h-3 w-3 text-white"
            >
              <path
                fillRule="evenodd"
                d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </TimelineContent>

          <TimelineContent
            as="h1"
            className="text-4xl leading-[100%] text-[var(--text-primary)] sm:text-5xl xl:text-6xl 2xl:text-7xl"
          >
            {isSwahili ? "Shindana." : "Compete."}{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text font-semibold text-transparent">
              {isSwahili ? "Shinda Zawadi." : "Win Prizes."}
            </span>{" "}
            {isSwahili ? "Panda Ngazi." : "Level Up."}{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-semibold text-transparent">
              {isSwahili ? "Tambulika." : "Get Recognized."}
            </span>{" "}
          </TimelineContent>

          <TimelineContent
            as="p"
            className="mx-auto max-w-2xl text-sm text-[var(--text-secondary)] sm:text-lg lg:text-xl"
          >
            {isSwahili
              ? "Njoo PlayMechi, boresha uwezo wako, fuata zawadi halisi, na fanya jina lako lisikike. Ushindani safi, presha ya moja kwa moja, na nafasi ya kweli ya kuonekana."
              : "Pull up to PlayMechi, sharpen your skill, chase real prizes, and make your name ring out. Clean competition, live pressure, and a real shot to get seen."}
          </TimelineContent>
        </article>

        <div className="mx-auto grid w-[85%] grid-cols-2 gap-6 pt-20 md:grid-cols-3">
          {blocksDesign.map((component) => (
            <TimelineContent
              as="a"
              key={component.id}
              href={component.url}
              className="aspect-video overflow-hidden rounded-lg backdrop-blur-sm"
            >
              <figure className="relative h-full w-full">
                {component.imgSrc ? (
                  <Image
                    src={component.imgSrc}
                    alt={component.name}
                    width={400}
                    height={400}
                    className={cn("h-full w-full rounded-xl object-cover")}
                  />
                ) : null}
              </figure>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
              <div className="absolute bottom-2 left-2 px-2 py-1 sm:px-4 sm:py-2">
                <h2 className="text-sm font-medium capitalize leading-[140%] text-white md:text-lg xl:text-xl 2xl:text-xl">
                  {component.name}
                </h2>
              </div>
            </TimelineContent>
          ))}
        </div>
      </div>
    </section>
  );
}
