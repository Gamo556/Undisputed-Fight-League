import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Edit2, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Fighter } from "@shared/schema";

export function FightersTab() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  const { data: fighters = [], isLoading } = useQuery<Fighter[]>({
    queryKey: ["/api/fighters"],
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/fighters/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Fighter Deleted",
        description: "Fighter has been removed from your contacts.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fighters"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete fighter.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; discordId: string; displayName: string }) => {
      return apiRequest("PATCH", `/api/fighters/${data.id}`, {
        discordId: data.discordId,
        displayName: data.displayName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Fighter Updated",
        description: "Fighter information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fighters"] });
      setEditingId(null);
      setEditId("");
      setEditName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update fighter.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (fighter: Fighter) => {
    setEditingId(fighter.id);
    setEditId(fighter.discordId);
    setEditName(fighter.displayName);
  };

  const handleSaveEdit = () => {
    if (editingId && editId.trim() && editName.trim()) {
      updateMutation.mutate({ id: editingId, discordId: editId.trim(), displayName: editName.trim() });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground ml-2">Loading fighters...</span>
      </div>
    );
  }

  if (fighters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No saved fighters yet. Add one from the New Fight dialog.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {fighters.map((fighter) => (
          <Card key={fighter.id} className="p-4" data-testid={`fighter-card-${fighter.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium" data-testid={`fighter-name-${fighter.id}`}>{fighter.displayName}</p>
                <p className="text-sm text-muted-foreground" data-testid={`fighter-id-${fighter.id}`}>{fighter.discordId}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleStartEdit(fighter)}
                  data-testid={`button-edit-fighter-${fighter.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleDelete(fighter.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-fighter-${fighter.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent data-testid="dialog-edit-fighter">
          <DialogHeader>
            <DialogTitle>Edit Fighter</DialogTitle>
            <DialogDescription>Update fighter information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fighter-id">Discord User ID</Label>
              <Input
                id="edit-fighter-id"
                value={editId}
                onChange={(e) => setEditId(e.target.value)}
                data-testid="input-edit-fighter-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fighter-name">Display Name</Label>
              <Input
                id="edit-fighter-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-fighter-name"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingId(null)}
                data-testid="button-cancel-edit"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editId.trim() || !editName.trim() || updateMutation.isPending}
                data-testid="button-save-edit"
                className="flex-1"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
