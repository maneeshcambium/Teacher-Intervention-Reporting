"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AskPanel } from "@/components/AskPanel";
import { Sparkles } from "lucide-react";

export function AskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed bottom-6 right-6 z-40 rounded-full h-12 w-12 p-0 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        aria-label="Ask about your class"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
      <AskPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
