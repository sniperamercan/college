import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export function WelcomeHeader() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.fullName.split(" ")[0] || "Student";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <h1 className="text-3xl font-semibold" data-testid="text-welcome-greeting">
        {getGreeting()}, {firstName}
      </h1>
      <p className="mt-1 text-muted-foreground" data-testid="text-welcome-subtitle">
        Here's what's happening on campus today
      </p>
    </motion.div>
  );
}
