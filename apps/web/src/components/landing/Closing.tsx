import { GITHUB_URL } from "@/components/landing/links";
import { Icon } from "@/components/ui/Icon";

interface ClosingProps {
  onGetStarted?: () => void;
}

export function Closing({ onGetStarted }: ClosingProps) {
  return (
    <section className="closing wrap">
      <div className="reveal">
        <h2>Open your first channel</h2>
        <p>
          Make a workspace, send the link to two people, and say something. It
          will be there before you look up.
        </p>
        <div className="hero__cta">
          <button type="button" className="btn btn--primary" onClick={onGetStarted}>
            Get started free
          </button>
          <a className="btn btn--ghost" href={GITHUB_URL}>
            <Icon name="github" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
