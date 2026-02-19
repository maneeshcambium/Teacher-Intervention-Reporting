"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export function ImpactInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">What is Impact Analysis?</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Understanding Impact Analysis</DialogTitle>
          <DialogDescription>
            A plain-English guide to how we measure whether an assignment actually helped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold text-base mb-1">The Problem</h3>
            <p>
              You assign struggling students extra practice on IXL. Weeks later their scores go up.
              But did IXL actually help, or would their scores have gone up anyway from normal
              classroom learning?
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="font-semibold text-base mb-1">How It Works</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-medium">Two groups.</span> Students who completed the
                assignment (&ldquo;treated&rdquo;) and students who weren&apos;t assigned it at all
                (&ldquo;control&rdquo;). Both groups took the same two tests — one before the
                assignment and one after.
              </li>
              <li>
                <span className="font-medium">Measure the change for each group.</span>
                <div className="mt-1 ml-5 bg-muted rounded px-3 py-2 font-mono text-xs">
                  Treated: 5,285 → 5,340 = <span className="text-green-600">+55 pts</span>
                  <br />
                  Control: 5,465 → 5,470 = <span className="text-green-600">+5 pts</span>
                </div>
              </li>
              <li>
                <span className="font-medium">Subtract to isolate the effect.</span> The control
                group&apos;s +5 represents natural growth everyone experiences. So of the treated
                group&apos;s +55, only{" "}
                <span className="font-bold text-green-600">+50 points</span> (55 − 5) can be
                credited to the assignment.
              </li>
            </ol>
            <p className="mt-2">
              That <span className="font-bold">+50</span> is the{" "}
              <span className="font-semibold">&ldquo;DiD Impact&rdquo;</span> — the extra boost the
              assignment provided above and beyond what would have happened without it.
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="font-semibold text-base mb-1">
              What do &ldquo;p-value&rdquo; and &ldquo;Significant&rdquo; mean?
            </h3>
            <p>
              It answers: <em>&ldquo;Could this result be a fluke?&rdquo;</em> If you flip a coin 5
              times and get 4 heads, that might be luck. If you flip it 1,000 times and get 800
              heads, something real is going on. The p-value measures that — when it&apos;s below
              0.05 the result is very unlikely to be random chance, so we mark it{" "}
              <span className="text-green-600 font-semibold">Significant ✓</span>.
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="font-semibold text-base mb-1">Reading the Scatter Plot</h3>
            <p>
              Each dot is one student. The diagonal dashed line means &ldquo;no change.&rdquo; Dots{" "}
              <em>above</em> the line improved; dots <em>below</em> declined. You should see{" "}
              <span className="text-green-600 font-medium">green dots</span> (treated students)
              floating above the line more than{" "}
              <span className="text-gray-500 font-medium">gray dots</span> (control) — that&apos;s
              your visual proof the assignment worked.
            </p>
          </section>

          <Separator />
        </div>
      </DialogContent>
    </Dialog>
  );
}
