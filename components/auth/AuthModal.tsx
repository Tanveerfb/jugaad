"use client";

import { useState } from "react";
import {
  signInWithGoogle,
  signInAnonymously,
} from "@/lib/firebase/authHelpers";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { X, Loader2 } from "lucide-react";
import BrandLogo from "@/components/shared/BrandLogo";
import appConfig from "@/app.config";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  googleOnly?: boolean;
};

export default function AuthModal({
  isOpen,
  onClose,
  googleOnly = false,
}: Props) {
  const [loading, setLoading] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleGoogle() {
    setError("");
    setLoading("google");
    try {
      await signInWithGoogle();
      notify.success("Welcome to " + appConfig.name);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleGuest() {
    setError("");
    setLoading("guest");
    try {
      await signInAnonymously();
      notify.success("Welcome to " + appConfig.name);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo + name */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <BrandLogo variant="icon" />
          <h2 className="text-base font-semibold">{appConfig.name}</h2>
        </div>

        <div className="space-y-3">
          {/* Google */}
          <Button
            className="w-full"
            onClick={handleGoogle}
            disabled={loading !== null}
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          {!googleOnly && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Guest */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGuest}
                disabled={loading !== null}
              >
                {loading === "guest" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Continue as Guest
              </Button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Guest projects are saved locally only. Sign in to sync across
                devices.
              </p>
            </>
          )}

          {/* Error */}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
