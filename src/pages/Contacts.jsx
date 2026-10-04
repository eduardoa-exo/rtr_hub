import { motion } from "framer-motion";
import { Mail, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";

const CONTACT_EMAIL = "geral@ricteamracing.pt";

const contactLinks = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    description: "Para questões gerais da equipa",
  },
];

export default function Contacts() {
  return (
    <PageShell>
      <PageHero
        title="Contactos"
        subtitle="Fica em contacto com a Ric Team Racing. Envia-nos um email ou acompanha as transmissões do RicFazeres."
      />

      <main className="container py-12">
        <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
          {contactLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="card-racing overflow-hidden group cursor-pointer flex flex-col w-full max-w-sm"
              >
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
                    {item.label !== "Email" && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <h3 className="font-racing text-lg font-bold mb-1">
                    {item.value}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.a>
            );
          })}
        </div>
      </main>
    </PageShell>
  );
}
