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
  error,
}: SigninPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-14">
      <div className="flex w-full max-w-[380px] flex-col gap-5">
        <header className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight text-brand-900">
            Huddle
          </h1>
          <p className="text-xs text-text-muted">Welcome back</p>
        </header>

        <SigninForm onSubmit={onSubmit} error={error} />

        <p className="text-center text-xs text-text-muted">
          No account yet?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="font-medium text-brand-700 transition-colors hover:text-brand-800"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
