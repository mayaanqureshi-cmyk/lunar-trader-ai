import { Activity, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b-2 border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">TB</span>
              </div>
              <span className="text-sm font-bold tracking-wider">TRADEBOT</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 border-2 border-success bg-success/10">
              <Activity className="h-3 w-3 text-success animate-pulse-glow" />
              <span className="text-success text-xxs font-bold tracking-wider">ONLINE</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-border">
                  <User className="h-3 w-3" />
                  <span className="text-xxs font-medium">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="h-8 text-xxs font-bold tracking-wider border-2"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  EXIT
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="h-8 text-xxs font-bold tracking-wider"
              >
                LOGIN
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
