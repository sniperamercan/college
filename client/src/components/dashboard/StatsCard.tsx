import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange";
  delay?: number;
}

const colorClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export function StatsCard({ title, value, icon: Icon, color, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="hover-elevate transition-shadow" data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <motion.p
                className="text-3xl font-semibold tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
              >
                {value}
              </motion.p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
