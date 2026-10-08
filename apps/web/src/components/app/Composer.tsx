import { useLayoutEffect, useRef, useState, type Ref } from "react";

import { Icon } from "@/components/ui/Icon";

/** Matches the server's limit. */
export const MAX_MESSAGE_LENGTH = 4000;

interface ComposerProps {
  channelName: string;
  /** Return false when nothing was sent, so the draft stays in the box. */
  onSend: (text: string) => boolean | void;
  textareaRef?: Ref<HTMLTextAreaElement>;
}

export function Composer({ channelName, onSend, textareaRef }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  // Grow with the text, up to the CSS max-height. Only allow scrolling once the
  // text is past that: scrollHeight is rounded, so a single line can overflow
  // by a fraction of a pixel and show a scrollbar.
  useLayoutEffect(() => {
    const input = boxRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    input.style.overflowY = input.scrollHeight > 120 ? "auto" : "hidden";
  }, [draft]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (onSend(text) === false) return;
    setDraft("");
  };

  const placeholder = `Message #${channelName}`;

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="composer__box">
        <textarea
          ref={(node) => {
            boxRef.current = node;
            if (typeof textareaRef === "function") textareaRef(node);
            else if (textareaRef) textareaRef.current = node;
          }}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={MAX_MESSAGE_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className={draft.trim() ? "send is-ready" : "send"}
          title="Send"
          aria-label="Send message"
        >
          <Icon name="up" />
        </button>
      </div>
    </form>
  );
}
