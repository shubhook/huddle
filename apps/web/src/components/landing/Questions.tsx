const QUESTIONS = [
  [
    "What does it cost?",
    "Nothing. Huddle is open source. You run it, so there are no seats and no plan to upgrade to.",
  ],
  [
    "How does someone join?",
    "You copy an invite link and send it. They sign in, land in the workspace, and can talk in its channels. Links expire after 7 days.",
  ],
  [
    "What if I go offline?",
    "Huddle reconnects on its own. When you’re back, the channel fills in with what you missed.",
  ],
  [
    "Can I try it before I host it?",
    "The preview at the top of this page is the product. Type in it. When you want a workspace of your own, start with the button below.",
  ],
];

export function Questions() {
  return (
    <section className="section wrap" id="questions">
      <div className="section__head reveal">
        <span className="eyebrow">Questions</span>
        <h2>The short answers.</h2>
      </div>
      <dl className="qa">
        {QUESTIONS.map(([question, answer]) => (
          <div key={question} className="reveal">
            <dt>{question}</dt>
            <dd>{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
