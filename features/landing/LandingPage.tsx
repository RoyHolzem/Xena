'use client';

import { useEffect, useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import styles from './landing.module.css';

const formFields = {
  signIn: {
    username: { placeholder: 'Email', isRequired: true },
    password: { placeholder: 'Password', isRequired: true },
  },
  signUp: {
    username: { order: 1, placeholder: 'Email', label: 'Email', isRequired: true },
    password: { order: 2, placeholder: 'Password', isRequired: true },
    confirm_password: { order: 3, placeholder: 'Confirm password', isRequired: true },
  },
  confirmResetPassword: {
    confirmation_code: { placeholder: 'Code', label: 'Verification code' },
    password: { placeholder: 'New password' },
  },
  confirmSignIn: {
    confirmation_code: { label: 'Verification code', placeholder: 'Code' },
  },
};

const operatingModel = [
  {
    number: '01',
    title: 'Connect company context',
    body: 'Bring your operational data, APIs, and business systems into one governed workspace.',
  },
  {
    number: '02',
    title: 'Work as one team',
    body: 'Human operators investigate and decide together with specialized AI agents.',
  },
  {
    number: '03',
    title: 'Act with control',
    body: 'Agents execute approved actions while permissions and audit trails remain visible.',
  },
];

export function LandingPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [authMode, setAuthMode] = useState<'none' | 'signin' | 'signup'>('none');

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  useEffect(() => {
    if (authMode === 'none') return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAuthMode('none');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [authMode]);

  return (
    <main className={styles.page}>
      {authMode !== 'none' && (
        <div className={styles.authOverlay} onClick={() => setAuthMode('none')}>
          <div
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-label={authMode === 'signup' ? 'Create a Xena account' : 'Sign in to Xena'}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.authClose}
              onClick={() => setAuthMode('none')}
              type="button"
              aria-label="Close authentication dialog"
            >
              ×
            </button>
            <Authenticator
              formFields={formFields}
              initialState={authMode === 'signup' ? 'signUp' : 'signIn'}
              variation="modal"
            >
              {() => {
                onAuthenticated();
                return <div />;
              }}
            </Authenticator>
          </div>
        </div>
      )}

      <nav className={styles.nav} aria-label="Primary navigation">
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand} aria-label="Xena home">
            <img src="/logo.png" alt="Xena" />
          </a>

          <a className={styles.navLink} href="#how-xena-works">
            How Xena works
          </a>

          <div className={styles.navActions}>
            <button className={styles.signInButton} onClick={() => setAuthMode('signin')} type="button">
              Sign in
            </button>
            <button className={styles.primaryButtonSmall} onClick={() => setAuthMode('signup')} type="button">
              Enter Xena
            </button>
          </div>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span /> Human + AI operations
            </div>
            <h1>
              Your operators and AI agents.
              <span>One operational team.</span>
            </h1>
            <p>
              Xena is the shared workspace where human operators and AI agents work together on your
              company&apos;s own data, systems, and workflows.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#how-xena-works">
                See how Xena works
                <span aria-hidden="true">↓</span>
              </a>
              <button className={styles.secondaryButton} onClick={() => setAuthMode('signin')} type="button">
                Sign in
              </button>
            </div>
            <div className={styles.heroPrinciples}>
              <span>Company data</span>
              <i />
              <span>Human control</span>
              <i />
              <span>Agentic execution</span>
            </div>
          </div>

          <AnimatedShowcase />
        </div>
      </section>

      <section className={styles.modelSection} id="how-xena-works">
        <div className={styles.modelIntro}>
          <div className={styles.sectionLabel}>The Xena model</div>
          <h2>Not a chatbot beside the business. A shared operating layer inside it.</h2>
          <p>
            The human brings judgment. The agents bring speed and execution. Xena gives both the same
            live context, controls, and responsibility.
          </p>
        </div>

        <div className={styles.modelGrid}>
          {operatingModel.map((item) => (
            <article key={item.number} className={styles.modelItem}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <div className={styles.sectionLabel}>Human judgment. Agentic execution.</div>
          <h2>Put them in the same workspace.</h2>
        </div>
        <button className={styles.primaryButton} onClick={() => setAuthMode('signup')} type="button">
          Enter Xena <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className={styles.footer}>
        <img src="/logo.png" alt="Xena" />
        <span>Human + AI operations</span>
        <a href="https://github.com/RoyHolzem/Xena" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <small>© 2026 Xena</small>
      </footer>
    </main>
  );
}

function AnimatedShowcase() {
  const [recordVisible, setRecordVisible] = useState(false);

  return (
    <div className={styles.showcaseWrap} aria-label="Animated example of a human operator working with Xena">
      <div className={styles.showcaseLabel}>
        <span /> Live agentic UI
      </div>
      <div className={styles.demoShell}>
        <div className={styles.demoNav}>
          <div className={styles.demoNavDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.demoNavUrl}>app.xena.lu</div>
          <div className={styles.demoLive}>
            <span /> Live
          </div>
        </div>

        <div className={styles.demoBody}>
          <div className={styles.demoMessage}>
            <div className={`${styles.demoAvatar} ${styles.userAvatar}`}>R</div>
            <div className={styles.demoMessageContent}>
              <div className={styles.demoRole}>Human operator</div>
              <div className={`${styles.demoBubble} ${styles.userBubble}`}>
                What&apos;s the status of the Remich incident?
              </div>
            </div>
          </div>

          <div className={styles.demoMessage}>
            <div className={`${styles.demoAvatar} ${styles.agentAvatar}`}>
              <img src="/favicon.png" alt="" />
            </div>
            <div className={styles.demoMessageContent}>
              <div className={styles.demoRoleRow}>
                <span className={styles.demoRole}>Xena operator agent</span>
                <span className={styles.toolActivity}>
                  <i /> searching company data
                </span>
              </div>
              <div className={styles.demoBubble}>
                <TypingText
                  text="The Remich incident is INCIDENT-LUX-2026-0036 — an ONU failure at the customer handoff. It's currently OPEN with SEV4 severity. The affected service is FTTH in the Remich area."
                  onComplete={() => setRecordVisible(true)}
                />
              </div>

              <div className={`${styles.demoContextCard} ${recordVisible ? styles.demoContextCardVisible : ''}`}>
                <div className={styles.demoCardHeader}>
                  <span className={styles.demoCardType}>Company data · Incident</span>
                  <div className={styles.demoCardBadges}>
                    <span className={styles.demoBadgeSeverity}>SEV4</span>
                    <span className={styles.demoBadgeStatus}>OPEN</span>
                  </div>
                </div>
                <h3>ONU failure at customer handoff in Remich</h3>
                <div className={styles.demoCardMeta}>
                  <span>Remich</span>
                  <span>FTTH</span>
                  <span>Updated 2h ago</span>
                </div>
                <div className={styles.demoHandoff}>
                  <span className={styles.demoHandoffIcon}>H</span>
                  <div>
                    <strong>Operator stays in control</strong>
                    <span>Xena is ready to propose or execute the next approved action.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStarted(true), 850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, 14);
    return () => window.clearTimeout(timer);
  }, [displayed, onComplete, started, text]);

  return (
    <span>
      {displayed}
      <span className={styles.cursor}>|</span>
    </span>
  );
}
