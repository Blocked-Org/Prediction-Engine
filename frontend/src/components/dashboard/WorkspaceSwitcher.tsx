"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Check, ChevronsUpDown, Plus, Loader2, Briefcase } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspaceSummary = {
  id: string;
  workspace_name: string;
  workspace_slot: number;
  campaign_id: string;
  is_active: boolean;
};

type WorkspaceListResponse = {
  workspaces: WorkspaceSummary[];
  max_workspaces: number;
  can_create: boolean;
};

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSwitching, setIsSwitching] = useState<number | null>(null);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/v1/simulate/workspaces");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const activeWorkspace = data?.workspaces.find((ws) => ws.is_active);

  const handleSwitch = async (slot: number) => {
    if (slot === activeWorkspace?.workspace_slot) return;
    setIsSwitching(slot);
    try {
      const res = await fetch("/api/v1/simulate/workspaces/activate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_slot: slot }),
      });
      if (res.ok) {
        // Hard refresh to reload server components with the new active workspace
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setIsSwitching(null);
    }
  };

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/simulate/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        // Activate the new workspace
        const actRes = await fetch("/api/v1/simulate/workspaces/activate", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_slot: json.workspace_slot }),
        });
        if (actRes.ok) {
          setIsDialogOpen(false);
          // Redirect to onboarding
          router.push("/onboarding");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-full sm:w-[240px] rounded-md bg-[#E5E5E5]" />;
  }

  if (!data) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full sm:w-[240px] justify-between font-semibold border-[#E5E5E5] text-[#0A0A0A] bg-[#F5F5F0] hover:bg-[#EAEAE5]"
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">
                {activeWorkspace?.workspace_name || "Select Workspace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px] p-2 bg-white rounded-xl shadow-lg border border-[#E5E5E5]">
          <DropdownMenuLabel className="text-xs uppercase tracking-widest text-[#6B6B6B] px-2 py-1.5">
            Your Workspaces ({data.workspaces.length}/{data.max_workspaces})
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#E5E5E5] my-1" />
          {data.workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onSelect={(e) => {
                e.preventDefault();
                handleSwitch(ws.workspace_slot);
              }}
              className={`flex items-center justify-between rounded-lg px-2 py-2 cursor-pointer transition-colors ${
                ws.is_active ? "bg-[#0A0A0A] text-white" : "hover:bg-[#F5F5F0] text-[#0A0A0A]"
              }`}
            >
              <div className="flex flex-col gap-0.5 truncate pr-2">
                <span className="font-semibold text-sm truncate">{ws.workspace_name}</span>
                <span className={`text-[10px] ${ws.is_active ? "text-white/70" : "text-[#6B6B6B]"}`}>
                  Slot {ws.workspace_slot}
                </span>
              </div>
              {isSwitching === ws.workspace_slot ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : ws.is_active ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator className="bg-[#E5E5E5] my-1" />
          
          <DropdownMenuItem
            disabled={!data.can_create}
            onSelect={(e) => {
              e.preventDefault();
              setIsOpen(false);
              setIsDialogOpen(true);
            }}
            className={`flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer ${
              !data.can_create ? "opacity-50" : "hover:bg-[#F5F5F0]"
            }`}
          >
            <div className="p-1 rounded-md bg-[#0A0A0A] text-white shrink-0">
              <Plus className="h-3 w-3" />
            </div>
            <span className="font-semibold text-sm text-[#0A0A0A]">Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#E5E5E5]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-[#0A0A0A]">
              Create New Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Q3 Marketing Campaign"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              disabled={isCreating}
              className="w-full border border-[#E5E5E5]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
              className="border-[#E5E5E5] text-[#0A0A0A] font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newWorkspaceName.trim() || isCreating}
              className="bg-[#0A0A0A] text-white hover:bg-[#333] font-semibold"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
