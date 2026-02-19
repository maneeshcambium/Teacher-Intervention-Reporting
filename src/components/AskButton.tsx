"use client";

import { useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import Image from "next/image";

export function AskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full px-4 py-2 shadow-lg bg-white hover:bg-gray-50 border border-gray-200 transition-colors flex items-center gap-2"
        aria-label="Ask Cambi"
      >
        <Image
          src="/cambi.png"
          alt="Ask Cambi"
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="text-sm font-medium text-gray-700">Ask Cambi</span>
      </button>
      <AskPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
