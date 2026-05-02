import {
  Camera,
  CirclePlay,
  MessageCircle,
  MessagesSquare,
  MonitorPlay,
  ThumbsUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAYMECHI_SOCIAL_HANDLE, PLAYMECHI_WHATSAPP_GROUP_URL } from '@/lib/social-links';
import { cn } from '@/lib/utils';

const socials = [
  {
    label: 'WhatsApp',
    href: PLAYMECHI_WHATSAPP_GROUP_URL,
    icon: MessageCircle,
    className: 'border-[#25d366]/70 text-[#25d366] hover:bg-[#25d366]/10',
    metaLabel: 'Join group',
    ariaLabel: 'Join PlayMechi WhatsApp group',
  },
  {
    label: 'Instagram',
    href: `https://www.instagram.com/${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: Camera,
    className: 'border-[#e4405f]/70 text-[#f56040] hover:bg-[#e4405f]/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
  {
    label: 'YouTube',
    href: `https://www.youtube.com/@${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: CirclePlay,
    className: 'border-[#ff0033]/70 text-[#ff0033] hover:bg-[#ff0033]/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
  {
    label: 'Facebook',
    href: `https://www.facebook.com/${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: ThumbsUp,
    className: 'border-[#1877f2]/70 text-[#1877f2] hover:bg-[#1877f2]/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
  {
    label: 'Discord',
    href: `https://discord.gg/${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: MessagesSquare,
    className: 'border-[#5865f2]/70 text-[#8ea1ff] hover:bg-[#5865f2]/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
  {
    label: 'Twitch',
    href: `https://www.twitch.tv/${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: MonitorPlay,
    className: 'border-[#9146ff]/70 text-[#b78cff] hover:bg-[#9146ff]/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
  {
    label: 'X',
    href: `https://x.com/${PLAYMECHI_SOCIAL_HANDLE}`,
    icon: X,
    className: 'border-white/70 text-white hover:bg-white/10',
    metaLabel: `@${PLAYMECHI_SOCIAL_HANDLE}`,
  },
] satisfies Array<{
  ariaLabel?: string;
  className: string;
  href: string;
  icon: LucideIcon;
  label: string;
  metaLabel: string;
}>;

export function SocialButtons() {
  return (
    <div className="flex w-full max-w-sm flex-col justify-center gap-3">
      {socials.map(({ label, href, icon: Icon, className, metaLabel, ariaLabel }) => (
        <Button
          key={label}
          asChild
          variant="outline"
          className={cn(
            'h-12 justify-start border bg-[rgba(8,13,23,0.72)] px-4 text-sm shadow-[var(--shadow-soft)] backdrop-blur-md',
            className
          )}
        >
          <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel ?? `${label} ${metaLabel}`}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex flex-1 justify-center">{label}</span>
            <span className="text-xs font-semibold opacity-75">{metaLabel}</span>
          </a>
        </Button>
      ))}
    </div>
  );
}
