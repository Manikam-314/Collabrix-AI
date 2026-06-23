import "../../style/Component/Register/_home.scss";

function HomeCard() {
  return (
    <div className="HomeCard-container">
      <section id="features" className="features">
        <h2 className="section-title">Everything you need for great calls</h2>
        <div className="grid">
          <article className="card">
            <div className="icon i-video"></div>
            <h3>HD Video & Audio</h3>
            <p>Adaptive bitrate keeps calls smooth—even on flaky networks.</p>
          </article>
          <article className="card">
            <div className="icon i-screen"></div>
            <h3>Screen Sharing</h3>
            <p>Share your whole screen or a single app with one click.</p>
          </article>
          <article className="card">
            <div className="icon i-record"></div>
            <h3>Cloud Recording</h3>
            <p>Record meetings and revisit highlights anytime.</p>
          </article>
          <article className="card">
            <div className="icon i-shield"></div>
            <h3>Enterprise-grade Security</h3>
            <p>Waiting room, host controls, encryption—secure by default.</p>
          </article>
          <article className="card">
            <div className="icon i-bot"></div>
            <h3>AI Notes</h3>
            <p>Automatic transcripts, summaries, and action items.</p>
          </article>
          <article className="card">
            <div className="icon i-rooms"></div>
            <h3>Breakout Rooms</h3>
            <p>Split your meeting into focused groups in seconds.</p>
          </article>
        </div>
      </section>
      <section id="ai-notes" className="ai-notes">
        <div className="container">
          <h2 className="section-title">Real-time AI Note Taking</h2>
          <p className="lead">
            No more scrambling to write things down. Collabrix’s built-in AI
            captures your conversations live, highlights the most important
            moments, and creates actionable insights you can revisit later.
          </p>

          <div className="notes-grid">
            <div className="note-card">
              <h3>🎙️ Live Transcription</h3>
              <p>
                Every word spoken is transcribed in real time with high
                accuracy, so you never miss a detail.
              </p>
            </div>
            <div className="note-card">
              <h3>✨ Contextual Highlights</h3>
              <p>
                Key decisions, deadlines, and action items are automatically
                flagged so your team knows what matters most.
              </p>
            </div>
            <div className="note-card">
              <h3>📌 Smart Summaries</h3>
              <p>
                After the call, get clean summaries with bullet points and
                context that make follow-ups easy.
              </p>
            </div>
            <div className="note-card">
              <h3>🔗 Seamless Sharing</h3>
              <p>
                Instantly share notes with participants or export them to your
                favorite productivity apps.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="security" className="security">
        <div className="security-inner">
          <div className="security-copy">
            <h2 className="section-title">Security that scales with you</h2>
            <p>
              From personal catch-ups to company-wide town halls, Collabrix helps
              you keep your meetings safe and private.
            </p>
            <ul className="checks">
              <li>Waiting room & host controls</li>
              <li>Participant permissions</li>
              <li>Meeting lock</li>
              <li>Encrypted media transport</li>
            </ul>
          </div>
          <div className="security-visual" aria-hidden="true">
            <svg viewBox="0 0 300 200">
              <rect
                x="10"
                y="10"
                width="280"
                height="180"
                rx="18"
                fill="#0b63f6"
                opacity="0.1"
              />
              <rect
                x="30"
                y="30"
                width="240"
                height="140"
                rx="12"
                fill="#0b63f6"
                opacity="0.12"
              />
              <path
                d="M150 80 a24 24 0 0 1 24 24 v20 h-48 v-20 a24 24 0 0 1 24-24z"
                fill="#0b63f6"
              />
              <rect
                x="120"
                y="120"
                width="60"
                height="40"
                rx="6"
                fill="#163760"
              />
            </svg>
          </div>
        </div>
      </section>
      <section id="faq" className="faq">
        <h2 className="section-title">Frequently asked questions</h2>
        <details>
          <summary>Do I need to install anything?</summary>
          <p>
            No. Collabrix runs in your browser—just share a link and you’re in.
          </p>
        </details>
        <details>
          <summary>Is there a time limit on free meetings?</summary>
          <p>
            Free plan meetings are limited to 40 minutes. Upgrade for unlimited
            time.
          </p>
        </details>
        <details>
          <summary>Does it work on mobile?</summary>
          <p>Yes, the UI is fully responsive and touch-friendly.</p>
        </details>
      </section>
    </div>
  );
}

export default HomeCard;
