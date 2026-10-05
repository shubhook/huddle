const AUDIENCES = [
  {
    kind: "Studios",
    title: "The people shipping this week",
    body: "Design, engineering, and whoever is writing the launch note. One workspace. A channel per job.",
  },
  {
    kind: "Classes",
    title: "A group that meets after hours",
    body: "The reading, the questions, the “did anyone start this.” It stays in one place instead of a dozen texts.",
  },
  {
    kind: "Side projects",
    title: "Friends, and a name for the thing",
    body: "Make the workspace, send the link, and the first message is the kickoff. No seats to buy.",
  },
];

export function Teams() {
  return (
    <section className="section wrap" id="for">
      <div className="section__head section__head--center reveal">
        <span className="eyebrow">Teams</span>
        <h2>Built for groups that are still small on purpose.</h2>
        <p>
          Huddle is the chat you stand up for the people in the room, not a
          company of five thousand.
        </p>
      </div>
      <div className="audiences">
        {AUDIENCES.map((audience) => (
          <article key={audience.kind} className="reveal">
            <p>{audience.kind}</p>
            <h3>{audience.title}</h3>
            <span>{audience.body}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
