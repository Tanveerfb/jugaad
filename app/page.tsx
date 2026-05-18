"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import appConfig from "@/app.config";
import { Button } from "@/components/ui/button";
import { stackOptions } from "@/components/stack/stackRegistry";
import {
  ArrowRight,
  GitBranch,
  Zap,
  MessageSquare,
  Layers,
  Code2,
  FolderOpen,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const steps = [
  {
    icon: MessageSquare,
    title: "Describe your app",
    body: "Chat with the planning agent to define features, pages, and data models.",
  },
  {
    icon: Layers,
    title: "Choose your stack",
    body: "Pick from curated libraries. Mutual exclusion handled automatically.",
  },
  {
    icon: Zap,
    title: "Generate tasks",
    body: "AI decomposes your plan into ordered file generation tasks.",
  },
  {
    icon: FolderOpen,
    title: "Build on disk",
    body: "Files land directly in your chosen folder via the File System API.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center flex-1 px-6 pt-24 pb-16 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <motion.div variants={fadeUp} className="flex justify-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20">
              <Code2 className="h-8 w-8 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl font-bold tracking-tight"
          >
            {appConfig.name}
          </motion.h1>

          <motion.p variants={fadeUp} className="text-xl text-muted-foreground">
            {appConfig.tagline}
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed"
          >
            {appConfig.description} Describe your app, pick your stack, and
            watch it get built file by file — locally, with your own LLM.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-3 pt-2"
          >
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/studio/new" />}
            >
              Start Building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <a
                  href={appConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <GitBranch className="mr-2 h-4 w-4" />
              View on GitHub
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="text-xs text-muted-foreground">
            Works with Ollama and LM Studio — no cloud AI required
          </motion.p>
        </motion.div>
      </main>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold text-center mb-12"
          >
            How it works
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-5"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Step {i + 1}
                  </p>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16 bg-muted/10">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold text-center mb-8"
          >
            Works with your stack
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {stackOptions.map((opt) => (
              <span
                key={opt.id}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {opt.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">
              {appConfig.name}
            </span>
            {" — "}
            {appConfig.tagline}
          </div>
          <div className="flex items-center gap-4">
            {appConfig.links.docs !== "#" && (
              <a
                href={appConfig.links.docs}
                className="hover:text-foreground transition-colors"
              >
                Docs
              </a>
            )}
            {appConfig.links.github !== "#" && (
              <a
                href={appConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            )}
            {appConfig.links.feedback !== "#" && (
              <a
                href={appConfig.links.feedback}
                className="hover:text-foreground transition-colors"
              >
                Feedback
              </a>
            )}
            <span>v{appConfig.version}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
