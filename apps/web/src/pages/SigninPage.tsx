import { SigninForm } from "@/components/auth/SigninForm";

interface SigninPageProps {
  onSubmit?: (values: { email: string; password: string }) => void | Promise<void>;
  onSignUp?: () => void;
  onForgotPassword?: () => void;
  error?: string;
}

export function SigninPage({
  onSubmit,
  onSignUp,
  onForgotPassword,
  error,
}: SigninPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-16">
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[32px] font-semibold leading-[38.4px] tracking-[-0.8px] text-ink">
            Huddle
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.6px] text-text-subtle">
            Authentication
          </p>
        </header>

        <SigninForm
          onSubmit={onSubmit}
          onForgotPassword={onForgotPassword}
          error={error}
        />

        <p className="text-center text-[13px] leading-[18.2px] text-text-subtle">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="font-medium text-ink transition-colors hover:text-ink/80"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}