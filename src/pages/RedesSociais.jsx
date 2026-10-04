import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";

const YOUTUBE_RED = "#FF0000";
const TWITCH_PURPLE = "#9146FF";
const INSTAGRAM_PINK = "#E4405F";

const YOUTUBE_RTR = "https://www.youtube.com/@RicTeamRacing";
const YOUTUBE_RICFAZERES = "https://www.youtube.com/@RicFazeres";
const TWITCH_RICFAZERES = "https://www.twitch.tv/ricfazeres";
const TWITCH_RTR = "https://www.twitch.tv/ricteamracing";
const INSTAGRAM_RTR = "https://www.instagram.com/ricteamracing/";
const INSTAGRAM_RICFAZERES = "https://www.instagram.com/ricfazeres/";

function YouTubeLogo({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill={YOUTUBE_RED}
        d="M43.2 13H4.8C2.1 13 0 15.1 0 17.8v12.4c0 2.7 2.1 4.8 4.8 4.8h38.4c2.7 0 4.8-2.1 4.8-4.8V17.8c0-2.7-2.1-4.8-4.8-4.8z"
      />

      <path fill="white" d="M19.5 31.5V16.5l13 7.5-13 7.5z" />
    </svg>
  );
}

function TwitchLogo({ className }) {
  return (
    <svg viewBox="0 0 2400 2800" className={className} aria-hidden>
      <path
        fill={TWITCH_PURPLE}
        d="M500 0L0 500v1800h600v500l500-500h400l900-900V0H500zm1700 1300l-400 400h-400l-350 350v-350H600V200h1600v1100z"
      />

      <path
        fill="white"
        d="M1700 550h200v600h-200V550zm-500 0h200v600h-200V550z"
      />
    </svg>
  );
}

function InstagramLogo({ className }) {
  return (
    <img
      src="/images/instagram.png"
      alt="Instagram"
      loading="lazy"
      decoding="async"
      className={`object-contain ${className ?? ""}`}
      aria-hidden
    />
  );
}

const sections = [
  {
    title: "Ric Team Racing",
    // subtitle: "Canal oficial da equipa",
    links: [
      {
        platform: "YouTube",
        href: YOUTUBE_RTR,
        label: "@RicTeamRacing",
        // description: "Transmissões e highlights da equipa",
        Logo: YouTubeLogo,
        color: YOUTUBE_RED,
      },
      {
        platform: "Twitch",
        href: TWITCH_RTR,
        label: "RicTeamRacing",
        // description: "Transmissões ao vivo na Twitch",
        Logo: TwitchLogo,
        color: TWITCH_PURPLE,
      },
      {
        platform: "Instagram",
        href: INSTAGRAM_RTR,
        label: "RicTeamRacing",
        // description: "Fotos e vídeos da equipa",
        Logo: InstagramLogo,
        color: INSTAGRAM_PINK,
      },
    ],
  },
  {
    title: "RicFazeres",
    // subtitle: "Transmissões e sim racing",
    links: [
      {
        platform: "YouTube",
        href: YOUTUBE_RICFAZERES,
        label: "@RicFazeres",
        // description: "Canal YouTube do RicFazeres",
        Logo: YouTubeLogo,
        color: YOUTUBE_RED,
      },
      {
        platform: "Twitch",
        href: TWITCH_RICFAZERES,
        label: "RicFazeres",
        // description: "Transmissões ao vivo na Twitch",
        Logo: TwitchLogo,
        color: TWITCH_PURPLE,
      },
      {
        platform: "Instagram",
        href: INSTAGRAM_RICFAZERES,
        label: "RicFazeres",
        // description: "Fotos e vídeos do RicFazeres",
        Logo: InstagramLogo,
        color: INSTAGRAM_PINK,
      },
    ],
  },
];

export default function RedesSociais() {
  return (
    <PageShell>
      <PageHero
        title="Redes Sociais"
        subtitle="Segue a Ric Team Racing e o RicFazeres no YouTube e na Twitch. Transmissões, highlights e tudo sobre sim racing."
      />

      {/* Content */}
      <main className="container py-12">
        <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12">
          {sections.map((section, sectionIndex) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <div className="mb-6 text-center">
                <h2 className="font-racing text-2xl font-bold mb-1">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {/* {section.subtitle} */}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {section.links.map((link, index) => {
                  const Logo = link.Logo;
                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 25, scale: 0.95 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: sectionIndex * 0.1 + index * 0.08,
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      className="card-racing overflow-hidden group cursor-pointer flex min-w-0 flex-col"
                    >
                      <div className="p-4 sm:p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl overflow-hidden"
                            style={{ backgroundColor: `${link.color}20` }}
                          >
                            <Logo className="h-7 w-7" />
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: link.color }}
                          >
                            {link.platform}
                          </span>
                        </div>
                        <h3 className="font-racing text-lg font-bold mb-1">
                          {link.label}
                        </h3>
                        {link.description && (
                          <p className="text-sm text-muted-foreground">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
