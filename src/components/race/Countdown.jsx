import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

function calculateTimeLeft(date) {
  const difference = new Date(date).getTime() - new Date().getTime();
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isExpired: false,
  };
}

export function Countdown({ targetDate, raceName }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="inline-flex flex-col items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border/50 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <Calendar className="h-3.5 w-3.5" />
        <span>Próxima corrida</span>
      </div>

      <div className="font-racing text-sm text-center text-foreground/90 max-w-xs truncate">
        {raceName}
      </div>

      <div className="flex items-center gap-3">
        <TimeUnit value={timeLeft.days} label="Dias" />
        <Separator />
        <TimeUnit value={timeLeft.hours} label="Horas" />
        <Separator />
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <Separator />
        <TimeUnit value={timeLeft.seconds} label="Seg" />
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <div className="font-racing text-2xl md:text-3xl font-bold text-primary tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <div className="text-2xl md:text-3xl font-bold text-primary/30 select-none">
      :
    </div>
  );
}
