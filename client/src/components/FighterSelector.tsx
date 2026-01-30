import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Fighter } from "@shared/schema";

interface FighterSelectorProps {
  onSelect: (fighter: { id: string; username: string }) => void;
}

export function FighterSelector({ onSelect }: FighterSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const { data: fighters = [], isLoading } = useQuery<Fighter[]>({
    queryKey: ["/api/fighters"],
    enabled: open,
  });

  const addFighterMutation = useMutation({
    mutationFn: async (data: { discordId: string; displayName: string }) => {
      const response = await apiRequest("POST", "/api/fighters", data);
      return response as Fighter;
    },
    onSuccess: (fighter: Fighter) => {
      onSelect({ id: fighter.discordId, username: fighter.displayName });
      queryClient.invalidateQueries({ queryKey: ["/api/fighters"] });
      setNewId("");
      setNewName("");
      setShowAddForm(false);
      setOpen(false);
    },
  });

  const handleSelectFighter = (fighter: Fighter) => {
    onSelect({ id: fighter.discordId, username: fighter.displayName });
    setOpen(false);
  };

  const handleAddFighter = () => {
    if (newId.trim() && newName.trim()) {
      addFighterMutation.mutate({ discordId: newId.trim(), displayName: newName.trim() });
    }
  };

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setOpen(true)}
        data-testid="button-fighter-selector"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-fighter-selector">
          <DialogHeader>
            <DialogTitle>Select Fighter</DialogTitle>
            <DialogDescription>
              Choose from saved fighters or add a new one
            </DialogDescription>
          </DialogHeader>

          {!showAddForm ? (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground ml-2">Loading fighters...</span>
                </div>
              ) : fighters.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {fighters.map((fighter) => (
                    <Button
                      key={fighter.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSelectFighter(fighter)}
                      data-testid={`button-fighter-${fighter.id}`}
                    >
                      {fighter.displayName} ({fighter.discordId})
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved fighters yet
                </p>
              )}

              <Button
                variant="default"
                className="w-full"
                onClick={() => setShowAddForm(true)}
                data-testid="button-add-new-fighter"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Fighter
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-fighter-id">Discord User ID</Label>
                <Input
                  id="new-fighter-id"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="123456789012345678"
                  data-testid="input-new-fighter-id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-fighter-name">Display Name</Label>
                <Input
                  id="new-fighter-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Fighter name"
                  data-testid="input-new-fighter-name"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewId("");
                    setNewName("");
                  }}
                  data-testid="button-cancel-add-fighter"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFighter}
                  disabled={!newId.trim() || !newName.trim() || addFighterMutation.isPending}
                  data-testid="button-save-new-fighter"
                  className="flex-1"
                >
                  {addFighterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Fighter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
