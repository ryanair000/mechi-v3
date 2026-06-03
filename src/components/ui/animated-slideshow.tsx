"use client";

import * as React from "react";
import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import { useRegionalSettings } from "@/components/RegionalSettingsProvider";
import { cn } from "@/lib/utils";

interface TextStaggerHoverProps {
  text: string;
  index: number;
  label?: string;
}

interface HoverSliderImageProps {
  index: number;
  imageUrl: string;
}

interface HoverSliderContextValue {
  activeSlide: number;
  changeSlide: (index: number) => void;
}

type Slide = {
  id: string;
  title: string;
  label: string;
  imageUrl: string;
};

const LEADERBOARD_SLIDES: Slide[] = [
  {
    id: "slide-1",
    title: "pubg mobile",
    label: "PUBG Mobile",
    imageUrl: "/images/playmechi/leaderboard/pubgm-winners.png",
  },
  {
    id: "slide-2",
    title: "codm",
    label: "CODM",
    imageUrl: "/images/playmechi/leaderboard/codm-winners.png",
  },
  {
    id: "slide-3",
    title: "efootball",
    label: "eFootball",
    imageUrl: "/images/playmechi/leaderboard/efootball-winners.png",
  },
  {
    id: "slide-4",
    title: "weekend cup",
    label: "Weekend Cup",
    imageUrl: "/images/playmechi/leaderboard/weekend-cup-winners.png",
  },
  {
    id: "slide-5",
    title: "weka mawe",
    label: "Weka Mawe",
    imageUrl: "/images/playmechi/weka-mawe-weekly-poster.png",
  },
];

function splitText(text: string) {
  const words = text.split(" ").map((word) => word.concat(" "));
  const characters = words.map((word) => word.split("")).flat(1);

  return {
    words,
    characters,
  };
}

const HoverSliderContext = React.createContext<
  HoverSliderContextValue | undefined
>(undefined);

function useHoverSliderContext() {
  const context = React.useContext(HoverSliderContext);
  if (context === undefined) {
    throw new Error(
      "useHoverSliderContext must be used within a HoverSliderProvider"
    );
  }
  return context;
}

export const HoverSlider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const [activeSlide, setActiveSlide] = React.useState<number>(0);
  const changeSlide = React.useCallback(
    (index: number) => setActiveSlide(index),
    []
  );

  return (
    <HoverSliderContext.Provider value={{ activeSlide, changeSlide }}>
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    </HoverSliderContext.Provider>
  );
});
HoverSlider.displayName = "HoverSlider";

export const WordStaggerHover = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ children, className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-block origin-bottom overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});
WordStaggerHover.displayName = "WordStaggerHover";

export const TextStaggerHover = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & TextStaggerHoverProps
>(({ text, index, label, className, ...props }, ref) => {
  const { activeSlide, changeSlide } = useHoverSliderContext();
  const { characters } = splitText(text);
  const isActive = activeSlide === index;
  const handleMouse = () => changeSlide(index);
  const accessibleLabel = label ?? text;

  return (
    <button
      type="button"
      className={cn(
        "relative inline-block origin-bottom overflow-hidden border-0 bg-transparent p-0 text-left text-inherit appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(201,100,66)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]",
        className
      )}
      {...props}
      aria-label={accessibleLabel}
      ref={ref}
      onMouseEnter={handleMouse}
      onFocus={handleMouse}
    >
      <span className="sr-only">{accessibleLabel}</span>
      {characters.map((char, charIndex) => (
        <span
          key={`${char}-${charIndex}`}
          className="relative inline-block overflow-hidden"
          aria-hidden="true"
        >
          <MotionConfig
            transition={{
              delay: charIndex * 0.025,
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <motion.span
              className="inline-block opacity-20 before:content-[attr(data-char)]"
              data-char={char === " " ? "\u00a0" : char}
              initial={{ y: "0%" }}
              animate={isActive ? { y: "-110%" } : { y: "0%" }}
            />

            <motion.span
              className="absolute left-0 top-0 inline-block opacity-100 before:content-[attr(data-char)]"
              data-char={char === " " ? "\u00a0" : char}
              initial={{ y: "110%" }}
              animate={isActive ? { y: "0%" } : { y: "110%" }}
            />
          </MotionConfig>
        </span>
      ))}
    </button>
  );
});
TextStaggerHover.displayName = "TextStaggerHover";

export const clipPathVariants = {
  visible: {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  },
  hidden: {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0px)",
  },
};

export const HoverSliderImageWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid overflow-hidden [&>*]:col-start-1 [&>*]:col-end-1 [&>*]:row-start-1 [&>*]:row-end-1 [&>*]:size-full",
        className
      )}
      {...props}
    />
  );
});
HoverSliderImageWrap.displayName = "HoverSliderImageWrap";

export const HoverSliderImage = React.forwardRef<
  HTMLImageElement,
  Omit<HTMLMotionProps<"img">, "src"> & HoverSliderImageProps
>(({ index, imageUrl, className, alt, ...props }, ref) => {
  const { activeSlide } = useHoverSliderContext();

  return (
    <motion.img
      className={cn("inline-block align-middle", className)}
      transition={{ ease: [0.33, 1, 0.68, 1], duration: 0.8 }}
      variants={clipPathVariants}
      animate={activeSlide === index ? "visible" : "hidden"}
      ref={ref}
      src={imageUrl}
      alt={alt}
      {...props}
    />
  );
});
HoverSliderImage.displayName = "HoverSliderImage";

export function AnimatedSlideshowSection() {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === "sw-TZ";

  return (
    <HoverSlider className="landing-shell px-4 py-8 text-[var(--text-primary)] md:px-12 md:py-12">
      <h3 className="mb-6 text-xs font-medium capitalize tracking-wide text-[rgb(201,100,66)]">
        {isSwahili ? "/ Highlights za Tournament" : "/ Tournament Highlights"}
      </h3>
      <div className="flex flex-col items-center justify-center gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex shrink-0 flex-col space-y-2 md:space-y-4">
          {LEADERBOARD_SLIDES.map((slide, index) => (
            <TextStaggerHover
              key={slide.id}
              index={index}
              className="cursor-pointer text-4xl font-bold uppercase tracking-tighter sm:text-5xl"
              text={slide.title}
              label={slide.label}
            />
          ))}
        </div>
        <HoverSliderImageWrap className="w-full max-w-xl lg:w-[42vw]">
          {LEADERBOARD_SLIDES.map((slide, index) => (
            <div key={slide.id}>
              <HoverSliderImage
                index={index}
                imageUrl={slide.imageUrl}
                alt={slide.label}
                className="size-full max-h-96 rounded-[var(--radius-panel)] object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </HoverSliderImageWrap>
      </div>
    </HoverSlider>
  );
}
