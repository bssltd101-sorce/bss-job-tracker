import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import bssLogo from "@assets/bss-logo.jpeg";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`transition-all duration-300 rounded-full ${
            i + 1 === current
              ? "w-6 h-3 bg-[#E8A020]"
              : i + 1 < current
              ? "w-3 h-3 bg-[#E8A020]/60"
              : "w-3 h-3 bg-border"
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground font-medium">
        Step {current} of {total}
      </span>
    </div>
  );
}

export default function ClientSetupPage() {
  const { user, completeSetup } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 2 state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3 state
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedGdpr, setAgreedGdpr] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleComplete() {
    if (!agreedTerms || !agreedGdpr) return;
    setSubmitting(true);
    try {
      await completeSetup(newPassword);
      // Auth state updates → AppShell routes to dashboard automatically
    } catch {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Top brand bar */}
      <header className="bg-[#0A0A0A] px-5 py-2.5 flex items-center justify-between">
        <span className="text-[#E8A020] font-semibold text-sm tracking-wide">
          Bright Star Solutions
        </span>
        <span className="text-white/40 text-xs">Account Setup</span>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <StepIndicator current={step} total={3} />

          {/* ── STEP 1: Welcome ── */}
          {step === 1 && (
            <Card className="shadow-sm">
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6 text-center">
                <div className="rounded-2xl overflow-hidden bg-[#0A0A0A] flex items-center justify-center p-6 w-full max-w-[260px] shadow-xl">
                  <img
                    src={bssLogo}
                    alt="Bright Star Solutions"
                    className="w-full h-auto object-contain"
                    crossOrigin="anonymous"
                  />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-bold tracking-tight">
                    Welcome to Your Property Portal
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Before you get started, we need a few moments to set up your account securely.
                  </p>
                </div>

                {user?.name && (
                  <div className="rounded-xl bg-[#E8A020]/10 border border-[#E8A020]/30 px-5 py-3">
                    <p className="text-sm font-medium text-[#E8A020]">
                      Hello, {user.name}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full max-w-xs font-semibold"
                  onClick={() => setStep(2)}
                >
                  Get Started →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Set Password ── */}
          {step === 2 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Create Your Password</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a secure password for your account. It must be at least 8 characters.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-medium">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordValid && (
                    <p className="text-xs text-destructive mt-1">
                      {newPassword.length < 8
                        ? "Password must be at least 8 characters."
                        : "Passwords do not match."}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button
                    className="flex-1 font-semibold"
                    disabled={!passwordValid}
                    onClick={() => setStep(3)}
                  >
                    Continue →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: Terms, Privacy & GDPR ── */}
          {step === 3 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Your Privacy & Our Terms</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Please read and agree to the following before accessing the portal.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Terms of Use */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Terms of Use</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By using the Bright Star Solutions client portal, you agree to use it solely for
                    viewing your property jobs and communicating with our team. You must not share
                    your login credentials with others. Access may be revoked if these terms are
                    breached.
                  </p>
                </div>

                {/* Privacy Policy */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Privacy & Data Protection</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bright Star Solutions Ltd is committed to protecting your personal data in
                    accordance with the UK General Data Protection Regulation (UK GDPR) and the Data
                    Protection Act 2018. We collect and process your name, email address, phone
                    number, and property details solely for the purpose of managing your maintenance
                    and renovation works. Your data is stored securely and will never be sold or
                    shared with third parties without your consent. You have the right to access,
                    correct, or request deletion of your data at any time by contacting us at{" "}
                    <a
                      href="mailto:support@bssltd.info"
                      className="text-[#E8A020] hover:underline"
                    >
                      support@bssltd.info
                    </a>
                    .
                  </p>
                </div>

                {/* GDPR Rights */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Your Rights Under UK GDPR</h3>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
                    <li>Right to access your personal data</li>
                    <li>Right to correct inaccurate data</li>
                    <li>Right to erasure ("right to be forgotten")</li>
                    <li>Right to restrict or object to processing</li>
                    <li>Right to data portability</li>
                    <li>Right to withdraw consent at any time</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    To exercise any of these rights, contact:{" "}
                    <a
                      href="mailto:support@bssltd.info"
                      className="text-[#E8A020] hover:underline"
                    >
                      support@bssltd.info
                    </a>
                  </p>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedTerms}
                      onCheckedChange={(v) => setAgreedTerms(!!v)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="agree-terms"
                      className="text-xs font-normal leading-relaxed cursor-pointer"
                    >
                      I have read and agree to the Terms of Use
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agree-gdpr"
                      checked={agreedGdpr}
                      onCheckedChange={(v) => setAgreedGdpr(!!v)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="agree-gdpr"
                      className="text-xs font-normal leading-relaxed cursor-pointer"
                    >
                      I understand and agree to how my personal data is processed in accordance with
                      UK GDPR
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <Button
                    className="flex-1 font-semibold text-xs"
                    disabled={!agreedTerms || !agreedGdpr || submitting}
                    onClick={handleComplete}
                  >
                    {submitting ? "Setting up…" : "Complete Setup & Access Portal →"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground border-t border-border">
        © 2026 Bright Star Solutions Ltd · Registered in England &amp; Wales ·{" "}
        <a href="mailto:support@bssltd.info" className="hover:text-foreground transition-colors">
          support@bssltd.info
        </a>{" "}
        · 020 3916 5777
      </footer>
    </div>
  );
}
