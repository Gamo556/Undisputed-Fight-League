import { useState } from "react";
import { CreateFightDialog } from "../CreateFightDialog";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function CreateFightDialogExample() {
  const [open, setOpen] = useState(true);

  return (
    <TooltipProvider>
      <Button onClick={() => setOpen(true)}>Create Fight</Button>
      <CreateFightDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(f1, f2, channelId) => console.log(`Fight created: ${f1.username} vs ${f2.username} in channel ${channelId}`)}
      />
    </TooltipProvider>
  );
}
