import { useState } from "react";
import { SettingsDialog } from "../SettingsDialog";
import { Button } from "@/components/ui/button";

// todo: remove mock functionality
const mockSettings = {
  autoNotifyOnMatch: true,
  notifyOnNewMessage: true,
  dmTemplate: "You've been matched for a fight!",
  fightChatPrefix: "fight-",
};

export default function SettingsDialogExample() {
  const [open, setOpen] = useState(true);
  const [settings, setSettings] = useState(mockSettings);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Settings</Button>
      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          console.log("Settings saved:", newSettings);
        }}
      />
    </div>
  );
}
