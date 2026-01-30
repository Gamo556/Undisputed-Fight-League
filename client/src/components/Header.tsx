import { ThemeToggle } from "./ThemeToggle";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Swords, Settings, RefreshCw } from "lucide-react";
import { SiDiscord } from "react-icons/si";

interface HeaderProps {
  botStatus: "online" | "offline";
  serverName?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

export function Header({ botStatus, serverName, onRefresh, onSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Swords className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">UBL Fight Manager</span>
              {serverName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <SiDiscord className="h-3 w-3" />
                  {serverName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={botStatus} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
