import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Droplets, Phone, ArrowRight, ChevronLeft, ShieldCheck, Mail } from "lucide-react";
import { signInWithGoogle, sendOtp, verifyOtp, signInWithEmail, signUpWithEmail } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Step = "landing" | "phone" | "otp" | "email";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
];

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpRefs] = useState<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const id = setTimeout(() => setTimer((t) => t - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [timer]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    const fp = `${country.code}${digits}`;
    try {
      setLoading(true);
      setError("");
      await sendOtp(fp);
      setFullPhone(fp);
      setStep("otp");
      setTimer(30);
      setTimeout(() => otpRefs[0]?.focus(), 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Failed to send OTP. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs[index + 1]?.focus();
    if (!value && index > 0) otpRefs[index - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await verifyOtp(fullPhone, code);
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Invalid OTP. Please check and try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    if (isSignUp && !fullName) { setError("Enter your full name."); return; }
    try {
      setLoading(true);
      setError("");
      if (isSignUp) {
        await signUpWithEmail(email, password, fullName);
        setError(""); // success — AuthContext will pick up the session
      } else {
        await signInWithEmail(email, password);
      }
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    await handleSendOtp();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col max-w-md mx-auto px-6">
      {/* Header */}
      <div className="pt-16 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-water shadow-water-lg mb-6">
          <Droplets className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">AquaPure</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          {step === "landing" && "Pure water. Delivered fast."}
          {step === "phone" && "Enter your mobile number"}
          {step === "otp" && "Verify your number"}
          {step === "email" && (isSignUp ? "Create an account" : "Sign in with email")}
        </p>
      </div>

      {/* ── Landing step ─────────────────────────────────── */}
      {step === "landing" && (
        <div className="flex-1 flex flex-col gap-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-background border-2 border-border/60 rounded-2xl py-4 font-extrabold text-foreground text-sm hover:bg-muted/50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-bold text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={() => setStep("phone")}
            className="w-full flex items-center justify-center gap-3 bg-primary rounded-2xl py-4 font-extrabold text-white text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-water"
          >
            <Phone className="h-5 w-5" />
            Continue with Phone
          </button>

          <button
            onClick={() => { setStep("email"); setError(""); }}
            className="w-full flex items-center justify-center gap-3 bg-background border-2 border-border/60 rounded-2xl py-4 font-extrabold text-foreground text-sm hover:bg-muted/50 active:scale-[0.98] transition-all shadow-sm"
          >
            <Mail className="h-5 w-5" />
            Continue with Email
          </button>

          {error && (
            <p className="text-center text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            By continuing you agree to our{" "}
            <span className="text-primary font-semibold">Terms of Service</span> and{" "}
            <span className="text-primary font-semibold">Privacy Policy</span>.
          </p>
        </div>
      )}

      {/* ── Phone step ───────────────────────────────────── */}
      {step === "phone" && (
        <div className="flex-1 flex flex-col gap-5">
          <button
            onClick={() => { setStep("landing"); setError(""); }}
            className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground -ml-1 mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex gap-2">
            <select
              value={country.code}
              onChange={(e) => setCountry(COUNTRY_CODES.find((c) => c.code === e.target.value)!)}
              className="shrink-0 bg-muted border border-border/60 rounded-2xl px-3 py-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              placeholder="Mobile number"
              maxLength={12}
              className="flex-1 bg-muted border border-border/60 rounded-2xl px-4 py-4 text-base font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleSendOtp}
            disabled={loading || phone.replace(/\D/g, "").length < 10}
            className="w-full h-14 rounded-2xl font-extrabold text-sm shadow-water gap-2"
          >
            {loading ? "Sending OTP…" : "Send OTP"} <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            We'll send a 6-digit code. Standard rates may apply.
          </p>
        </div>
      )}

      {/* ── Email step ───────────────────────────────────── */}
      {step === "email" && (
        <div className="flex-1 flex flex-col gap-4">
          <button
            onClick={() => { setStep("landing"); setError(""); }}
            className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground -ml-1 mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {isSignUp && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(""); }}
              placeholder="Full name"
              className="w-full bg-muted border border-border/60 rounded-2xl px-4 py-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
            placeholder="Email address"
            className="w-full bg-muted border border-border/60 rounded-2xl px-4 py-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
            placeholder="Password"
            className="w-full bg-muted border border-border/60 rounded-2xl px-4 py-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
          />

          {error && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full h-14 rounded-2xl font-extrabold text-sm shadow-water gap-2"
          >
            {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create Account" : "Sign In")}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignUp((s) => !s); setError(""); }}
              className="font-extrabold text-primary hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      )}

      {/* ── OTP step ─────────────────────────────────────── */}
      {step === "otp" && (
        <div className="flex-1 flex flex-col gap-5">
          <button
            onClick={() => { setStep("phone"); setError(""); setOtp(["", "", "", "", "", ""]); }}
            className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground -ml-1 mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Change number
          </button>

          <p className="text-sm text-muted-foreground font-medium">
            Enter the 6-digit code sent to{" "}
            <span className="font-extrabold text-foreground">{fullPhone}</span>
          </p>

          <div className="flex gap-2.5 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i - 1]?.focus();
                }}
                className={`w-12 h-14 text-center text-xl font-extrabold rounded-2xl border-2 bg-muted text-foreground focus:outline-none transition-all ${
                  digit ? "border-primary bg-primary/5" : "border-border/60 focus:border-primary/50"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-4 py-2 text-center">
              {error}
            </p>
          )}

          <Button
            onClick={handleVerifyOtp}
            disabled={loading || otp.join("").length < 6}
            className="w-full h-14 rounded-2xl font-extrabold text-sm shadow-water gap-2"
          >
            {loading ? "Verifying…" : "Verify & Continue"} <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            {timer > 0 ? (
              <span className="font-bold text-primary">Resend in {timer}s</span>
            ) : (
              <button onClick={handleResend} className="font-extrabold text-primary hover:underline">
                Resend OTP
              </button>
            )}
          </p>
        </div>
      )}

      <div className="pb-12 pt-8 flex items-center justify-center gap-4">
        {["🔒 Secure", "💧 Trusted", "⚡ Fast"].map((t) => (
          <span key={t} className="text-[11px] font-bold text-muted-foreground/70">{t}</span>
        ))}
      </div>
    </div>
  );
}
