'use client';

import { useCallback, useEffect, useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { ArchitectureScene } from './ArchitectureScene';
import styles from './landing.module.css';

type ViewId = 'overview' | 'workflow' | 'architecture' | 'trust';

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

const views: Array<{ id: ViewId; label: string; index: string }> = [
  { id: 'overview', label: 'Overview', index: '01' },
  { id: 'workflow', label: 'Live workflow', index: '02' },
  { id: 'architecture', label: 'Architecture', index: '03' },
  { id: 'trust', label: 'Trust model', index: '04' },
];

export function LandingPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [authMode, setAuthMode] = useState<'none' | 'signin' | 'signup'>('none');
  const [activeView, setActiveView] = useState<ViewId>('overview');

  useEffect(() => {
    const syncHash = () => {
      const requested = window.location.hash.slice(1) as ViewId;
      if (views.some((view) => view.id === requested)) setActiveView(requested);
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.setAttribute('data-theme', 'light');
    syncHash();
    window.addEventListener('hashchange', syncHash);

    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.removeAttribute('data-theme');
      window.removeEventListener('hashchange', syncHash);
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

  const selectView = useCallback((view: ViewId) => {
    setActiveView(view);
    window.history.replaceState(null, '', `#${view}`);
  }, []);

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

      <header className={styles.header}>
        <a className={styles.brand} href="#overview" onClick={() => selectView('overview')} aria-label="Xena overview">
          <img src="/logo.png" alt="Xena" />
          <span className={styles.brandDescriptor}>Human + AI operations</span>
        </a>

        <nav className={styles.viewNav} aria-label="Explore Xena">
          {views.map((view) => (
            <button
              key={view.id}
              className={`${styles.viewNavButton} ${activeView === view.id ? styles.viewNavButtonActive : ''}`}
              onClick={() => selectView(view.id)}
              type="button"
              aria-current={activeView === view.id ? 'page' : undefined}
            >
              <span>{view.index}</span>
              {view.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <div className={styles.systemStatus}>
            <span /> eu-central-1
          </div>
          <button className={styles.signInButton} onClick={() => setAuthMode('signin')} type="button">
            Sign in
          </button>
          <button className={styles.enterButton} onClick={() => setAuthMode('signup')} type="button">
            Enter Xena
            <ArrowIcon />
          </button>
        </div>
      </header>

      <div className={styles.viewport} key={activeView}>
        {activeView === 'overview' && <OverviewScene onSelect={selectView} onEnter={() => setAuthMode('signup')} />}
        {activeView === 'workflow' && <WorkflowScene />}
        {activeView === 'architecture' && <ArchitectureScene />}
        {activeView === 'trust' && <TrustScene onEnter={() => setAuthMode('signup')} />}
      </div>
    </main>
  );
}

function OverviewScene({ onSelect, onEnter }: { onSelect: (view: ViewId) => void; onEnter: () => void }) {
  return (
    <section className={`${styles.scene} ${styles.overviewScene}`} aria-labelledby="overview-title">
      <div className={styles.ambientGrid} aria-hidden="true" />
      <div className={styles.overviewCopy}>
        <div className={styles.kicker}><span /> A shared operational layer</div>
        <h1 id="overview-title">
          Human judgment.<br />
          Agent execution.<br />
          <em>One operating system.</em>
        </h1>
        <p>
          Xena lets human operators and specialized AI agents investigate, decide, and act together on your
          company&apos;s own data, systems, and workflows.
        </p>
        <div className={styles.overviewActions}>
          <button className={styles.darkButton} onClick={() => onSelect('workflow')} type="button">
            Watch a live workflow <ArrowIcon />
          </button>
          <button className={styles.lineButton} onClick={() => onSelect('architecture')} type="button">
            Explore the architecture
          </button>
          <button className={styles.mobileEnterButton} onClick={onEnter} type="button">Enter Xena</button>
        </div>
        <div className={styles.principleRail} aria-label="Xena principles">
          <div><span>01</span><strong>Company context</strong><small>Live, governed access</small></div>
          <div><span>02</span><strong>Human control</strong><small>Approval stays explicit</small></div>
          <div><span>03</span><strong>Agentic action</strong><small>Tools, not guesswork</small></div>
        </div>
      </div>

      <LiveOperatorDemo />

      <div className={styles.sceneIndex} aria-hidden="true">
        <span>01</span>
        <i />
        <span>04</span>
      </div>
    </section>
  );
}

function LiveOperatorDemo() {
  const [phase, setPhase] = useState(0);
  const typed = useCallback(() => setPhase(1), []);

  useEffect(() => {
    if (phase === 1) {
      const timer = window.setTimeout(() => setPhase(2), 2200);
      return () => window.clearTimeout(timer);
    }
    if (phase === 2) {
      const timer = window.setTimeout(() => setPhase(3), 1600);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className={styles.liveDemo} aria-label="Live example of a human operator and Xena agent working together">
      <div className={styles.liveDemoHalo} aria-hidden="true" />
      <div className={styles.demoTopline}>
        <div className={styles.windowDots} aria-hidden="true"><span /><span /><span /></div>
        <div className={styles.demoUrl}><i /> app.xena.lu <b>secure</b></div>
        <div className={styles.liveLabel}><span /> Live</div>
      </div>
      <div className={styles.demoStage}>
        <div className={styles.demoHeader}>
          <div>
            <span className={styles.monoLabel}>OPERATIONS / REMICH</span>
            <strong>Live incident room</strong>
          </div>
          <div className={styles.demoPresence}><i /> Human + agent online</div>
        </div>

        <div className={styles.messageRow}>
          <div className={`${styles.avatar} ${styles.humanAvatar}`}>RH</div>
          <div className={styles.messageBody}>
            <span>Human operator · just now</span>
            <div className={styles.humanMessage}>What&apos;s blocking the Remich customer handoff?</div>
          </div>
        </div>

        <div className={styles.messageRow}>
          <div className={`${styles.avatar} ${styles.xenaAvatar}`}><img src="/favicon.png" alt="" /></div>
          <div className={styles.messageBody}>
            <div className={styles.agentRoleRow}>
              <span>Xena operator · streaming</span>
              <b><i /> company_data.search</b>
            </div>
            <div className={styles.agentMessage}>
              <TypingText
                text="I found INCIDENT-LUX-2026-0036: an ONU failure at the customer handoff. Service is FTTH, severity SEV4, status OPEN."
                onComplete={typed}
              />
            </div>
          </div>
        </div>

        <div className={`${styles.incidentCard} ${phase >= 1 ? styles.reveal : ''}`}>
          <div className={styles.incidentTopline}>
            <span>Company data · incident</span>
            <div><b>SEV4</b><em>OPEN</em></div>
          </div>
          <strong>ONU failure at customer handoff</strong>
          <small>Remich · FTTH · updated 2h ago</small>
        </div>

        <div className={`${styles.approvalRow} ${phase >= 1 ? styles.reveal : ''}`}>
          <div className={styles.approvalCopy}>
            <span className={styles.approvalIcon}><CheckIcon /></span>
            <div>
              <strong>{phase >= 2 ? 'Action approved by human' : 'Approval required'}</strong>
              <small>Update incident owner and notify field team</small>
            </div>
          </div>
          <button
            className={phase >= 2 ? styles.approvedButton : styles.approveButton}
            onClick={() => setPhase(2)}
            disabled={phase >= 2}
            type="button"
          >
            {phase >= 2 ? 'Approved' : 'Approve action'}
          </button>
        </div>

        <div className={`${styles.executionBar} ${phase >= 2 ? styles.reveal : ''}`}>
          <div className={styles.executionTrack}><span className={phase >= 3 ? styles.executionDone : ''} /></div>
          <div>
            <span>{phase >= 3 ? 'Action complete' : 'Executing governed tools…'}</span>
            <b>{phase >= 3 ? 'Audit event XN-8842 recorded' : 'iam.scope → ops.incident.update'}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

const workflowSteps = [
  { id: 'intent', number: '01', title: 'Human intent', detail: 'An operator asks in natural language.' },
  { id: 'context', number: '02', title: 'Live context', detail: 'The agent queries governed company data.' },
  { id: 'decision', number: '03', title: 'Shared decision', detail: 'Evidence and proposed action stay visible.' },
  { id: 'action', number: '04', title: 'Tool execution', detail: 'Allowlisted Xena tools act through APIs.' },
  { id: 'audit', number: '05', title: 'Auditable result', detail: 'The outcome returns to the same workspace.' },
];

function WorkflowScene() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % workflowSteps.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={`${styles.scene} ${styles.workflowScene}`} aria-labelledby="workflow-title">
      <div className={styles.workflowIntro}>
        <div className={styles.kicker}><span /> Live workflow</div>
        <h2 id="workflow-title">One request.<br />One governed loop.</h2>
        <p>The interface keeps the human, the agent, and the operating record in the same line of sight.</p>
        <div className={styles.workflowStepList}>
          {workflowSteps.map((item, index) => (
            <button
              key={item.id}
              className={step === index ? styles.workflowStepActive : ''}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{item.number}</span>
              <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.workflowBoard}>
        <div className={styles.workflowBoardTop}>
          <span>LIVE OPERATION · INCIDENT-LUX-2026-0036</span>
          <div><i /> streaming event bus</div>
        </div>
        <div className={styles.workflowLanes}>
          <WorkflowLane label="Human operator" role="Judgment" active={step === 0 || step === 2} tone="human">
            <div className={styles.workflowCard}>
              <span>Intent</span>
              <strong>Resolve the customer handoff blocker</strong>
              <small>Natural language · authenticated user</small>
            </div>
            <div className={`${styles.workflowCard} ${styles.workflowCardAccent}`}>
              <span>Decision</span>
              <strong>Approve field-team notification</strong>
              <small>Explicit human confirmation</small>
            </div>
          </WorkflowLane>

          <WorkflowLane label="Xena agent" role="Reason + act" active={step === 1 || step === 3} tone="agent">
            <div className={styles.thinkingCard}>
              <div><span /><span /><span /></div>
              <small>Specialized operator skill</small>
              <strong>Correlating incident, service, and customer context</strong>
            </div>
            <div className={styles.toolStack}>
              <span className={step >= 1 ? styles.toolActive : ''}>company_data.search <i>read</i></span>
              <span className={step >= 3 ? styles.toolActive : ''}>incident.update <i>write</i></span>
              <span className={step >= 3 ? styles.toolActive : ''}>field_team.notify <i>action</i></span>
            </div>
          </WorkflowLane>

          <WorkflowLane label="Company systems" role="Evidence" active={step === 1 || step === 4} tone="system">
            <div className={styles.recordCard}>
              <span>INCIDENT</span>
              <strong>ONU failure · Remich</strong>
              <div><b>SEV4</b><em>OPEN</em></div>
            </div>
            <div className={styles.auditCard}>
              <span>AUDIT TRAIL</span>
              <div><i /> Identity verified</div>
              <div><i /> Scope permitted</div>
              <div className={step === 4 ? styles.auditComplete : ''}><i /> Result recorded</div>
            </div>
          </WorkflowLane>
        </div>
        <div className={styles.workflowPulseTrack} aria-hidden="true">
          <span style={{ left: `${8 + step * 21}%` }} />
        </div>
      </div>

      <div className={styles.sceneIndex} aria-hidden="true"><span>02</span><i /><span>04</span></div>
    </section>
  );
}

function WorkflowLane({ label, role, active, tone, children }: {
  label: string;
  role: string;
  active: boolean;
  tone: 'human' | 'agent' | 'system';
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.workflowLane} ${styles[`workflowLane_${tone}`]} ${active ? styles.workflowLaneActive : ''}`}>
      <div className={styles.workflowLaneHeader}>
        <div className={styles.laneGlyph}>{tone === 'human' ? 'H' : tone === 'agent' ? 'X' : 'D'}</div>
        <div><strong>{label}</strong><span>{role}</span></div>
        <i />
      </div>
      <div className={styles.workflowLaneBody}>{children}</div>
    </div>
  );
}

const controls = [
  {
    number: '01',
    title: 'No persistent application fleet',
    body: 'The Xena application and data plane runs on managed serverless services—no app VMs or Kubernetes control plane to patch.',
    result: 'Smaller runtime attack surface',
  },
  {
    number: '02',
    title: 'No agent-held company data',
    body: 'Agent context is transient. Operational records remain in access-controlled managed services, not on the agent island.',
    result: 'Clear data ownership boundary',
  },
  {
    number: '03',
    title: 'No credentials in the browser',
    body: 'Cognito JWTs guard routes; encrypted gateway and voice secrets are resolved server-side from Secrets Manager.',
    result: 'Secrets stay out of clients',
  },
  {
    number: '04',
    title: 'No agent shell path',
    body: 'Specialized skills and Xena tools expose explicit actions. The agent does not receive a Bash or operating-system command surface.',
    result: 'Allowlisted, auditable execution',
  },
];

function TrustScene({ onEnter }: { onEnter: () => void }) {
  const [activeControl, setActiveControl] = useState(0);

  return (
    <section className={`${styles.scene} ${styles.trustScene}`} aria-labelledby="trust-title">
      <div className={styles.trustIntro}>
        <div className={styles.kicker}><span /> Trust by architecture</div>
        <h2 id="trust-title">Remove entire classes of enterprise findings.</h2>
        <p>
          Managed boundaries replace persistent runtimes, ambient credentials, and open-ended agent access.
          The result is easier to reason about—and easier to govern.
        </p>
        <button className={styles.darkButton} onClick={onEnter} type="button">Enter the governed workspace <ArrowIcon /></button>
      </div>

      <div className={styles.controlGrid}>
        {controls.map((control, index) => (
          <button
            key={control.number}
            className={activeControl === index ? styles.controlCardActive : ''}
            onMouseEnter={() => setActiveControl(index)}
            onFocus={() => setActiveControl(index)}
            onClick={() => setActiveControl(index)}
            type="button"
          >
            <span>{control.number}</span>
            <strong>{control.title}</strong>
            <p>{control.body}</p>
            <small><CheckIcon /> {control.result}</small>
          </button>
        ))}
      </div>

      <div className={styles.boundaryPanel}>
        <div className={styles.boundaryTopline}>
          <span>EXECUTION BOUNDARY</span>
          <div><i /> enforced</div>
        </div>
        <div className={styles.boundaryFlow}>
          <div><span>01</span><strong>Identity</strong><small>Cognito + JWT</small></div>
          <i><ArrowIcon /></i>
          <div><span>02</span><strong>Intent</strong><small>Human request</small></div>
          <i><ArrowIcon /></i>
          <div><span>03</span><strong>Permission</strong><small>Scoped IAM</small></div>
          <i><ArrowIcon /></i>
          <div><span>04</span><strong>Tool</strong><small>Allowlisted action</small></div>
          <i><ArrowIcon /></i>
          <div><span>05</span><strong>Evidence</strong><small>Audit result</small></div>
        </div>
        <div className={styles.boundaryFoot}>
          <span>Company data remains in its managed boundary</span>
          <span>Agent island is replaceable</span>
          <span>Application scales to zero</span>
        </div>
      </div>

      <div className={styles.sceneIndex} aria-hidden="true"><span>04</span><i /><span>04</span></div>
    </section>
  );
}

function TypingText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStarted(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 11);
    return () => window.clearTimeout(timer);
  }, [displayed, onComplete, started, text]);

  return <span>{displayed}<span className={styles.cursor}>|</span></span>;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
