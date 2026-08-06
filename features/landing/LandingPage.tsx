'use client';

import { useEffect, useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { XenaLogo } from './XenaLogo';
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

const principles = [
  {
    number: '01',
    title: 'Connected to company context',
    body: 'Agents work with governed access to the operational data, APIs, and systems your teams already use.',
  },
  {
    number: '02',
    title: 'Humans remain in control',
    body: 'Operators investigate with agents, approve sensitive actions, and can intervene at every decision point.',
  },
  {
    number: '03',
    title: 'Actions happen in real systems',
    body: 'Approved agents update records, trigger workflows, and leave a complete audit trail—not just another answer.',
  },
];

export function LandingPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [authMode, setAuthMode] = useState<'none' | 'signin' | 'signup'>('none');

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.body.style.overflow = 'hidden';
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
          <a className={styles.brand} href="#top" aria-label="Xena home">
            <XenaLogo size={32} withWordmark={false} className={styles.brandMark} />
            <span className={styles.brandName}>Xena</span>
          </a>

          <div className={styles.navCenter}>
            <a href="#live-demo">How it works</a>
            <a href="#platform">Platform</a>
          </div>

          <div className={styles.navActions}>
            <button className={styles.btnText} onClick={() => setAuthMode('signin')} type="button">
              Sign in
            </button>
            <button className={styles.btnPrimary} onClick={() => setAuthMode('signup')} type="button">
              Enter Xena
            </button>
          </div>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroAura} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Human + AI operations
          </div>
          <h1 className={styles.heroTitle}>
            Human operators and AI agents.
            <span>Working as one.</span>
          </h1>
          <p className={styles.heroCopy}>
            Xena connects people and AI to your company&apos;s own data, systems, and workflows—so they can
            investigate, decide, and act together in real time.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.btnHero} href="#live-demo">
              See Xena in action
              <span aria-hidden="true">↓</span>
            </a>
            <button className={styles.btnSecondary} onClick={() => setAuthMode('signin')} type="button">
              Sign in to the platform
            </button>
          </div>
          <div className={styles.heroTrust} aria-label="Platform principles">
            <span>Your data</span>
            <i aria-hidden="true" />
            <span>Your systems</span>
            <i aria-hidden="true" />
            <span>Your control</span>
          </div>
        </div>
      </section>

      <section className={styles.demoSection} id="live-demo">
        <div className={styles.sectionIntro}>
          <div>
            <div className={styles.sectionLabel}>Live hybrid operations</div>
            <h2>Watch people and agents investigate, decide, and act together.</h2>
          </div>
          <p>
            Xena does not sit beside your operations as another chatbot. It brings the operator, the agent,
            and live company context into one governed workspace.
          </p>
        </div>

        <div className={styles.browserFrame}>
          <div className={styles.browserBar}>
            <div className={styles.browserDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className={styles.browserAddress}>app.xena.lu</div>
            <div className={styles.browserLive}>
              <span /> Live
            </div>
          </div>

          <div className={styles.demoWorkspace}>
            <div className={styles.conversation}>
              <div className={`${styles.messageRow} ${styles.revealOne}`}>
                <div className={`${styles.avatar} ${styles.humanAvatar}`}>R</div>
                <div className={styles.messageContent}>
                  <div className={styles.messageRole}>Human operator</div>
                  <div className={`${styles.messageBubble} ${styles.humanBubble}`}>
                    What&apos;s the status of the Remich incident?
                  </div>
                </div>
              </div>

              <div className={`${styles.messageRow} ${styles.revealTwo}`}>
                <div className={`${styles.avatar} ${styles.agentAvatar}`}>
                  <XenaLogo size={24} withWordmark={false} />
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageRoleRow}>
                    <span className={styles.messageRole}>Xena operator agent</span>
                    <span className={styles.toolTrace}>
                      <span /> searched company incidents
                    </span>
                  </div>
                  <div className={styles.messageBubble}>
                    The Remich incident is <strong>INCIDENT-LUX-2026-0036</strong>—an ONU failure at the
                    customer handoff. It is currently open with SEV4 severity. The customer has not yet been notified.
                  </div>

                  <article className={styles.recordCard} aria-label="Company incident record">
                    <div className={styles.recordTopline}>
                      <span>Company data · Incident</span>
                      <div className={styles.recordBadges}>
                        <span className={styles.badgeSeverity}>SEV4</span>
                        <span className={styles.badgeOpen}>Open</span>
                      </div>
                    </div>
                    <h3>ONU failure at customer handoff in Remich</h3>
                    <div className={styles.recordMeta}>
                      <span>Remich</span>
                      <span>FTTH</span>
                      <span>Updated 2 minutes ago</span>
                    </div>
                  </article>
                </div>
              </div>

              <div className={`${styles.messageRow} ${styles.revealThree}`}>
                <div className={`${styles.avatar} ${styles.humanAvatar}`}>R</div>
                <div className={styles.messageContent}>
                  <div className={styles.messageRole}>Human operator</div>
                  <div className={`${styles.messageBubble} ${styles.humanBubble}`}>
                    Acknowledge it and notify the customer.
                  </div>
                </div>
              </div>

              <div className={`${styles.actionCard} ${styles.revealFour}`}>
                <div className={styles.actionHeader}>
                  <div>
                    <span className={styles.actionKicker}>Agent action plan</span>
                    <strong>Human approval received</strong>
                  </div>
                  <span className={styles.approvedBadge}>Approved by Roy</span>
                </div>
                <div className={styles.actionList}>
                  <div>
                    <span className={styles.actionCheck}>✓</span>
                    <span>Incident status changed</span>
                    <strong>OPEN → ACKNOWLEDGED</strong>
                  </div>
                  <div>
                    <span className={styles.actionCheck}>✓</span>
                    <span>Customer notification sent</span>
                    <strong>Approved template</strong>
                  </div>
                </div>
              </div>
            </div>

            <aside className={styles.contextRail} aria-label="Operational context">
              <div className={styles.contextHeader}>
                <span className={styles.contextPulse} />
                Operational context
              </div>

              <div className={styles.contextBlock}>
                <div className={styles.contextLabel}>Connected source</div>
                <div className={styles.sourceRow}>
                  <span className={styles.sourceMark}>DB</span>
                  <div>
                    <strong>Company incidents</strong>
                    <span>DynamoDB · eu-central-1</span>
                  </div>
                </div>
              </div>

              <div className={styles.contextBlock}>
                <div className={styles.contextLabel}>Active guardrail</div>
                <strong className={styles.contextValue}>Human approval required</strong>
                <p>Status changes and customer communication require an authenticated operator.</p>
              </div>

              <div className={styles.contextBlock}>
                <div className={styles.contextLabel}>Audit trail</div>
                <div className={styles.auditRow}>
                  <span>4</span>
                  <div>
                    <strong>Actions recorded</strong>
                    <p>Identity, decision, tool call, result</p>
                  </div>
                </div>
              </div>

              <div className={styles.contextFooter}>
                <span>Human</span>
                <i>+</i>
                <span>Agent</span>
                <i>+</i>
                <span>Data</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.platformSection} id="platform">
        <div className={styles.platformHeading}>
          <div className={styles.sectionLabel}>The Xena model</div>
          <h2>Not another chatbot. An operational workspace.</h2>
          <p>
            Human judgment and agentic execution share the same context, controls, and responsibility.
          </p>
        </div>

        <div className={styles.principleGrid}>
          {principles.map((principle) => (
            <article className={styles.principle} key={principle.number}>
              <span className={styles.principleNumber}>{principle.number}</span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.sectionLabel}>One operating layer</span>
          <h2>Put your operators and agents on the same team.</h2>
        </div>
        <button className={styles.btnHero} onClick={() => setAuthMode('signup')} type="button">
          Enter Xena <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <XenaLogo size={26} withWordmark={false} />
          <strong>Xena</strong>
          <span>Human + AI operations</span>
        </div>
        <a href="https://github.com/RoyHolzem/Xena" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span>© 2026 Xena</span>
      </footer>
    </main>
  );
}
