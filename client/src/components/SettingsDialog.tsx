import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Settings {
  autoNotifyOnMatch: boolean;
  notifyOnNewMessage: boolean;
  dmTemplate: string;
  fightChatPrefix: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle>Bot Settings</DialogTitle>
          <DialogDescription>
            Configure how the bot handles fight notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-notify">Auto DM on Match</Label>
              <p className="text-xs text-muted-foreground">
                Automatically DM fighters when matched
              </p>
            </div>
            <Switch
              id="auto-notify"
              checked={localSettings.autoNotifyOnMatch}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, autoNotifyOnMatch: checked })
              }
              data-testid="switch-auto-notify"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="message-notify">Message Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Notify fighters of new messages in chat
              </p>
            </div>
            <Switch
              id="message-notify"
              checked={localSettings.notifyOnNewMessage}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, notifyOnNewMessage: checked })
              }
              data-testid="switch-message-notify"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fight-prefix">Fight Chat Prefix</Label>
            <Input
              id="fight-prefix"
              value={localSettings.fightChatPrefix}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, fightChatPrefix: e.target.value })
              }
              placeholder="fight-"
              data-testid="input-fight-prefix"
            />
            <p className="text-xs text-muted-foreground">
              Prefix used to identify fight chat channels
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dm-template">DM Template</Label>
            <Input
              id="dm-template"
              value={localSettings.dmTemplate}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, dmTemplate: e.target.value })
              }
              placeholder="You have a new fight match!"
              data-testid="input-dm-template"
            />
            <p className="text-xs text-muted-foreground">
              Message sent when a new fight is created
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-settings">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
