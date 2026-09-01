export function Footer() {
  return (
    <footer className="w-full border-t border-hairline px-5 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-ink">
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-[5px] bg-ink"
          >
            <span className="grid grid-cols-2 gap-0.5">
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
            </span>
          </span>
          <span className="text-sm font-semibold tracking-tight">Huddle</span>
        </span>
        <p className="text-xs text-text-placeholder">
          Built to learn WebSockets. Runs on a cloud server when deployed.
        </p>
      </div>
    </footer>
  );
}
