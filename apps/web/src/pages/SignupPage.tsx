import { SignupForm } from "@/components/auth/SignupForm";

interface SignupPageProps {
  onSubmit?: (values: {
    username: string;
    email: string;
    password: string;
  }) => void | Promise<void>;
  onSignIn?: () => void;
  error?: string;
}

export function SignupPage({ onSubmit, onSignIn, error }: SignupPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-14">
      <SignupForm onSubmit={onSubmit} onSignIn={onSignIn} error={error} />
    </div>
  );
}
