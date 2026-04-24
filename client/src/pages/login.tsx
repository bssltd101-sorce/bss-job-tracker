import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Phone, Mail } from "lucide-react";
import bssLogo from "@assets/bss-logo.jpeg";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Please check your email and password.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">

      {/* ── Top contact bar ───────────────────────────────────────────────── */}
      <header className="bg-[#0A0A0A] px-5 py-2.5 flex items-center justify-between">
        <span className="text-[#E8A020] font-semibold text-sm tracking-wide">
          Bright Star Solutions
        </span>
        <a
          href="tel:02012345678"
          className="flex items-center gap-1.5 text-white/60 hover:text-[#E8A020] text-sm transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>020 1234 5678</span>
        </a>
      </header>

      {/* ── Centred login area ────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-5">

          {/* Logo on black background — matches brand identity */}
          <div className="rounded-2xl overflow-hidden bg-[#0A0A0A] flex items-center justify-center p-6 shadow-xl">
            <img
              src={bssLogo}
              alt="Bright Star Solutions — Property Maintenance and Renovations"
              className="w-full max-w-[280px] h-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* Portal label */}
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
              Your Property Portal
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold">Sign in to your account</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track your maintenance &amp; renovation jobs in real time
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPw(!showPw)}
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {/* Contact links */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Need help accessing your account?
              </p>
              <div className="flex gap-2">
                <a
                  href="tel:02012345678"
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  020 1234 5678
                </a>
                <a
                  href="mailto:info@brightstarsolutions.co.uk"
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  Email us
                </a>
              </div>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground mb-1">Demo logins</div>
            <div><span className="font-medium">Admin:</span> admin@bssltd.co.uk / admin123</div>
            <div><span className="font-medium">Client:</span> john.smith@example.com / client123</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} Bright Star Solutions Ltd &middot; Property Maintenance &amp; Renovations
      </footer>
    </div>
  );
}
