"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";

type BuyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BuyModal({ open, onOpenChange }: BuyModalProps) {
  const { pricing } = useLandingContent();
  const copy = pricing.buyModal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.body}{" "}
            <a href={`mailto:${copy.email}`} className="font-medium text-foreground">
              {copy.email}
            </a>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{copy.close}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
