import Link from "next/link";
import appConfig from "@/app.config";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen px-6 bg-background">
      <div className="flex flex-col items-center gap-6 text-center max-w-xl">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20">
          <Zap className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            {appConfig.name}
          </h1>
          <p className="text-xl text-muted-foreground">{appConfig.tagline}</p>
        </div>

        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {appConfig.description} Describe your app, pick your stack, and watch
          it get built file by file — locally, with your own LLM.
        </p>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/studio/new" />}
          >
            Open Studio
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            Configure LLM
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          v{appConfig.version} · Works with Ollama &amp; LM Studio
        </p>
      </div>
    </main>
  );
}
