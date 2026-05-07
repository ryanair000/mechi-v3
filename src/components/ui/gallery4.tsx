/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
}

export interface Gallery4Props {
  title?: string;
  description?: string;
  items: Gallery4Item[];
}

const Gallery4 = ({
  title = "Case Studies",
  description = "Discover how leading companies and developers are leveraging modern web technologies to build exceptional digital experiences. These case studies showcase real-world applications and success stories.",
  items = [],
}: Gallery4Props) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    const updateSelection = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
    };
  }, [carouselApi]);

  return (
    <section className="py-16 sm:py-20">
      <div className="landing-shell">
        <div className="mb-6 flex items-end justify-between gap-4 md:mb-8 lg:mb-10">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-3xl font-medium md:text-4xl lg:text-[2.75rem]">
              {title}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {description}
            </p>
          </div>
          <div className="hidden shrink-0 gap-2 md:flex">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Previous slide"
              onClick={() => {
                carouselApi?.scrollPrev();
              }}
              disabled={!canScrollPrev}
              className="h-10 w-10 rounded-full border-[rgba(50,224,196,0.22)] bg-[var(--surface-strong)] text-[var(--text-primary)] hover:border-[rgba(50,224,196,0.36)] hover:bg-[var(--accent-secondary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Next slide"
              onClick={() => {
                carouselApi?.scrollNext();
              }}
              disabled={!canScrollNext}
              className="h-10 w-10 rounded-full border-[rgba(50,224,196,0.22)] bg-[var(--surface-strong)] text-[var(--text-primary)] hover:border-[rgba(50,224,196,0.36)] hover:bg-[var(--accent-secondary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>

        <Carousel
          className="pr-3 md:pr-4"
          setApi={setCarouselApi}
          opts={{
            breakpoints: {
              "(max-width: 768px)": {
                dragFree: true,
              },
            },
          }}
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className="max-w-[228px] pl-3 md:max-w-[244px] md:pl-4"
              >
                <Link href={item.href} className="group rounded-xl">
                  <div className="group relative h-full min-h-[17.5rem] max-w-full overflow-hidden rounded-xl md:min-h-[18rem] md:aspect-[5/4] lg:aspect-[16/9]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="absolute h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(10,16,28,0.98),rgba(24,38,60,0.92))]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/72 via-[44%] to-black/12" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-t from-black/38 via-black/10 to-transparent p-5 text-primary-foreground md:p-6">
                      <div className="mb-2 pt-3 text-lg font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] md:mb-2.5 md:pt-4 md:text-xl">
                        {item.title}
                      </div>
                      <div className="mb-5 line-clamp-2 text-sm leading-6 text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] md:mb-6">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="mt-6 flex justify-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                currentSlide === index
                  ? 'bg-[var(--accent-secondary)]'
                  : 'bg-[rgba(50,224,196,0.22)]'
              }`}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export { Gallery4 };
