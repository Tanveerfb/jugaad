"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeFolder } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServerAction } from "@/hooks/use-server-action";

/**
 * Takes a folder off the list, after saying exactly what that does and doesn't do — nothing on
 * disk changes, and adding the folder back brings its history back.
 */
export function RemoveFolder({ folderId, name, busy }: { folderId: string; name: string; busy: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, run } = useServerAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy}>
          Remove from list
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name} from the list?</DialogTitle>
          <DialogDescription>
            Jugaad stops looking at this folder. Nothing in it is moved or deleted. Its plans and undo history are kept, and
            come back if you add the folder again — until then they can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              run(async () => {
                const result = await removeFolder(folderId);
                if (result.ok) {
                  setOpen(false);
                  router.push("/organiser");
                }
                return result;
              })
            }
          >
            Remove from list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
