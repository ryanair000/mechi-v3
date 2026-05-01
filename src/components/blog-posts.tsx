'use client';

import Link from "next/link";
import { MoveRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlogPost {
  id: number;
  title: string;
  category: string;
  description?: string;
  imageUrl: string;
  href: string;
  views?: number;
  readTime?: number;
  rating?: number;
  className?: string;
}

interface GridSectionProps {
  title?: string;
  description?: string;
  backgroundLabel?: string;
  backgroundPosition?: "left" | "right";
  posts?: BlogPost[];
  className?: string;
  onPostClick?: (post: BlogPost) => void;
}

export const Component = ({
    title,
    description,
    backgroundLabel,
    backgroundPosition = "left",
    posts = [],
    className,
    onPostClick,
  }: GridSectionProps) => {

  return (
    <section className={cn(
      "container relative mx-auto px-4",
      className
    )}>
      {title ? (
        <h1 className="mb-2 text-center text-4xl font-semibold capitalize !leading-[1.4] md:text-5xl lg:text-6xl">
          {title}
        </h1>
      ) : null}
      
      {backgroundLabel && (
        <span
          className={cn(
            "absolute -top-10 -z-50 select-none text-[180px] font-extrabold leading-[1] text-black/[0.03] md:text-[250px] lg:text-[400px] text-foreground/[0.025]",
            backgroundPosition === "left" ? "-left-[18%]" : "-right-[28%]"
          )}
        >
          {backgroundLabel}
        </span>
      )}
      
      {description ? (
        <p className="mx-auto mb-8 max-w-[800px] text-center text-xl !leading-[2] text-foreground/50 md:text-2xl">
          {description}
        </p>
      ) : null}
      
      <div className="grid h-auto grid-cols-1 gap-4 md:h-[520px] md:grid-cols-2 lg:grid-cols-[1fr_0.5fr]">
        {posts.map((post, index) => {
          const {
            id,
            title: postTitle,
            category,
            description: postDescription,
            imageUrl,
            views,
            readTime,
            rating = 4,
            className: postClassName
          } = post;
          
          const isPrimary = index === 0;

          return (
            <Link
              key={id}
              href={post.href}
              style={{ backgroundImage: `url(${imageUrl})` }}
              className={cn(
                "group relative row-span-1 flex size-full cursor-pointer flex-col justify-end overflow-hidden rounded-2xl bg-cover bg-center bg-no-repeat p-4 text-white max-md:h-[240px] transition-all duration-300 hover:scale-[0.98] hover:rotate-[0.3deg]",
                isPrimary && "col-span-1 row-span-1 md:col-span-2 md:row-span-2 lg:col-span-1",
                postClassName
              )}
              onClick={(event) => {
                if (!onPostClick) {
                  return;
                }

                event.preventDefault();
                onPostClick(post);
              }}
            >
              <div className="absolute inset-0 -z-0 h-[130%] w-full bg-gradient-to-t from-black/80 to-transparent transition-all duration-500 group-hover:h-full" />
              
              <article className="relative z-0 flex items-end">
                <div className="flex flex-1 flex-col gap-2.5">
                  <h2 className="text-2xl font-semibold md:text-3xl">
                    {postTitle}
                  </h2>
                  {postDescription ? (
                    <p className="max-w-xl text-sm font-medium leading-6 text-white/80 md:text-base">
                      {postDescription}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2.5">
                    <span className="w-fit rounded-md bg-white/40 px-2 py-px text-sm capitalize text-white backdrop-blur-md">{category}</span>
                    {views !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              width={16}
                              height={16}
                              key={idx}
                              stroke={idx < rating ? "#ffa534" : "#B9B8B8aa"}
                              fill={idx < rating ? "#ffa534" : "#B9B8B8aa"}
                            />
                          ))}
                        </div>
                        <span className="text-base font-thin">
                          ({views} Views)
                        </span>
                      </div>
                    ) : null}
                    {readTime && (
                      <div className="text-lg font-semibold">
                        {readTime} min read
                      </div>
                    )}
                  </div>
                </div>
                <MoveRight
                  className="transition-all duration-300 group-hover:translate-x-2"
                  color="white"
                  width={32}
                  height={32}
                  strokeWidth={1.25}
                />
              </article>
            </Link>
          );
        })}
      </div>
    </section>  );
};
