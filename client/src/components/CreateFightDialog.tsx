import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Swords, HelpCircle, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { FighterSelector } from "@/components/FighterSelector";

interface Fighter {
  id: string;
  username: string;
}

interface Guild {
  id: string;
  name: string;
}

interface CreateFightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (fighter1: Fighter, fighter2: Fighter, fightType: string, guildId: string, rounds?: number | string) => void;
}

export function CreateFightDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateFightDialogProps) {
  const [fighter1Id, setFighter1Id] = useState("");
  const [fighter1Username, setFighter1Username] = useState("");
  const [fighter2Id, setFighter2Id] = useState("");
  const [fighter2Username, setFighter2Username] = useState("");
  const [fightType, setFightType] = useState<string>("");
  const [guildId, setGuildId] = useState<string>("");
  const [rounds, setRounds] = useState<string>("");

  // Fetch available guilds
  const { data: guilds = [], isLoading: guildsLoading } = useQuery<Guild[]>({
    queryKey: ["/api/bot/guilds"],
    enabled: open,
  });

  const isLiveFight = fightType === 'On The Rise' || fightType === 'Thursday Throwdown';

  const handleCreate = () => {
    if (fighter1Id.trim() && fighter1Username.trim() && fighter2Id.trim() && fighter2Username.trim() && fightType && guildId && (!isLiveFight || rounds)) {
      onCreate(
        { id: fighter1Id.trim(), username: fighter1Username.trim() },
        { id: fighter2Id.trim(), username: fighter2Username.trim() },
        fightType,
        guildId,
        rounds ? (isNaN(Number(rounds)) ? rounds : Number(rounds)) : undefined
      );
      setFighter1Id("");
      setFighter1Username("");
      setFighter2Id("");
      setFighter2Username("");
      setFightType("");
      setGuildId("");
      setRounds("");
      onOpenChange(false);
    }
  };

  const isValid = fighter1Id?.trim() && fighter1Username?.trim() && 
                  fighter2Id?.trim() && fighter2Username?.trim() && 
                  fightType && guildId && (!isLiveFight || rounds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-fight">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Create New Fight
          </DialogTitle>
          <DialogDescription>
            Select fight type and enter Discord details for both fighters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="guild-id" className="text-sm font-medium">Discord Guild</Label>
            {guildsLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground ml-2">Loading guilds...</span>
              </div>
            ) : (
              <Select value={guildId} onValueChange={setGuildId}>
                <SelectTrigger id="guild-id" data-testid="select-guild">
                  <SelectValue placeholder="Select Discord server" />
                </SelectTrigger>
                <SelectContent>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id} data-testid={`guild-option-${guild.id}`}>
                      {guild.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fight-type" className="text-sm font-medium">Fight Type</Label>
            <Select value={fightType} onValueChange={(value) => { setFightType(value); setRounds(""); }}>
              <SelectTrigger id="fight-type" data-testid="select-fight-type">
                <SelectValue placeholder="Select fight type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAF">CAF</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="On The Rise">On The Rise (Wednesday)</SelectItem>
                <SelectItem value="Thursday Throwdown">Thursday Throwdown (Thursday)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLiveFight && (
            <div className="space-y-1.5">
              <Label htmlFor="rounds" className="text-sm font-medium">Rounds / Championship</Label>
              <Select value={rounds} onValueChange={(value) => { setRounds(value); }}>
                <SelectTrigger id="rounds" data-testid="select-rounds">
                  <SelectValue placeholder="Select rounds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 Rounds</SelectItem>
                  <SelectItem value="10">10 Rounds</SelectItem>
                  <SelectItem value="RBC">RBC Championship</SelectItem>
                  <SelectItem value="ABC">ABC Championship</SelectItem>
                  <SelectItem value="World">World Championship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 p-3 rounded-md bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fighter 1</span>
              <FighterSelector onSelect={(fighter) => {
                setFighter1Id(fighter.id);
                setFighter1Username(fighter.username);
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="fighter1-id" className="text-xs">Discord User ID</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Right-click the user in Discord and select "Copy User ID". Enable Developer Mode in Discord settings if you don't see this option.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="fighter1-id"
                  value={fighter1Id}
                  onChange={(e) => setFighter1Id(e.target.value)}
                  placeholder="e.g. 123456789012345678"
                  data-testid="input-fighter1-id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fighter1-username" className="text-xs">Display Name</Label>
                <Input
                  id="fighter1-username"
                  value={fighter1Username}
                  onChange={(e) => setFighter1Username(e.target.value)}
                  placeholder="e.g. IronMike2024"
                  data-testid="input-fighter1-username"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm font-bold text-muted-foreground">VS</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3 p-3 rounded-md bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fighter 2</span>
              <FighterSelector onSelect={(fighter) => {
                setFighter2Id(fighter.id);
                setFighter2Username(fighter.username);
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="fighter2-id" className="text-xs">Discord User ID</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Right-click the user in Discord and select "Copy User ID". Enable Developer Mode in Discord settings if you don't see this option.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="fighter2-id"
                  value={fighter2Id}
                  onChange={(e) => setFighter2Id(e.target.value)}
                  placeholder="e.g. 987654321098765432"
                  data-testid="input-fighter2-id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fighter2-username" className="text-xs">Display Name</Label>
                <Input
                  id="fighter2-username"
                  value={fighter2Username}
                  onChange={(e) => setFighter2Username(e.target.value)}
                  placeholder="e.g. KnockoutKing"
                  data-testid="input-fighter2-username"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-fight">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid}
            data-testid="button-create-fight"
          >
            Create Fight & Send DMs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
