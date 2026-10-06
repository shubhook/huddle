import type { ReactNode } from "react";

import { LogoMark } from "@/components/ui/LogoMark";
import { Icon } from "@/components/ui/Icon";
import { startGithubLogin } from "@/lib/api";
import "@/components/account/account.css";

interface AccountLayoutProps {
  title: string;
  lede: ReactNode;
  children: ReactNode;
}

/** Logo bar and a narrow sheet: the frame for sign-in, sign-up and setup screens. */
export function AccountLayout({ title, lede, children }: AccountLayoutProps) {
  return (
    <div className="flow">
      <header className="flow__top">
        <a className="logo" href="#/" aria-label="Huddle home">
          <LogoMark />
          huddle
        </a>
      </header>
      <section className="sheet">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
        {children}
      </section>
    </div>
  );
}

export function GithubButton() {
  return (
    <>
      <button type="button" className="gh" onClick={() => startGithubLogin()}>
        <Icon name="github" />
        Continue with GitHub
      </button>
      <div className="or">or</div>
    </>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
