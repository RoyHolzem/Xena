'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import styles from './landing.module.css';

type LayerId = 'delivery' | 'runtime' | 'agent' | 'voice';

type ArchitectureNode = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  layers: LayerId[];
  description: string;
  evidence: string[];
};

const layers: Array<{ id: LayerId; number: string; label: string; headline: string; summary: string }> = [
  {
    id: 'delivery',
    number: '01',
    label: 'Delivery',
    headline: 'Repository to working environment',
    summary: 'Infrastructure, application, and branch delivery are defined together and automatically deployed.',
  },
  {
    id: 'runtime',
    number: '02',
    label: 'Live runtime',
    headline: 'A managed, event-driven application plane',
    summary: 'Authenticated traffic crosses explicit APIs, serverless compute, scoped IAM, and managed data services.',
  },
  {
    id: 'agent',
    number: '03',
    label: 'Agent island',
    headline: 'Agent capability without infrastructure access',
    summary: 'OpenClaw is isolated from the application plane and acts only through specialized skills and Xena tools.',
  },
  {
    id: 'voice',
    number: '04',
    label: 'Voice loop',
    headline: 'Speech joins the same governed stream',
    summary: 'STT and TTS enter through authenticated serverless routes and return through the live Xena interface.',
  },
];

const nodes: ArchitectureNode[] = [
  {
    id: 'source', code: 'GIT', title: 'Xena repository', subtitle: 'Application + infrastructure', x: 9, y: 17,
    layers: ['delivery'],
    description: 'The frontend, APIs, infrastructure templates, and agent configuration are versioned as one recoverable system.',
    evidence: ['Git-backed source of truth', 'Environment configuration by branch', 'Reviewable infrastructure changes'],
  },
  {
    id: 'pipeline', code: 'CD', title: 'IaC + CI/CD', subtitle: 'CloudFormation · SAM', x: 29, y: 17,
    layers: ['delivery'],
    description: 'A push becomes a controlled deployment. Infrastructure and application changes travel through the same repeatable path.',
    evidence: ['Automatic branch deployment', 'Declarative AWS resources', 'Rebuildable environments'],
  },
  {
    id: 'amplify', code: 'WEB', title: 'Amplify runtime', subtitle: 'Next.js · CDN · SSR', x: 49, y: 17,
    layers: ['delivery', 'runtime'],
    description: 'The web experience runs on managed hosting and serverless rendering instead of a persistent application fleet.',
    evidence: ['Managed frontend delivery', 'Serverless route execution', 'Main, staging, experimental branches'],
  },
  {
    id: 'identity', code: 'ID', title: 'Cognito identity', subtitle: 'Sign-on · JWT', x: 72, y: 17,
    layers: ['delivery', 'runtime'],
    description: 'User identity is established before protected application routes or operational APIs accept a request.',
    evidence: ['Hosted user pool', 'JWT verification', 'Optional federated sign-on'],
  },
  {
    id: 'operator', code: 'UI', title: 'Operator workspace', subtitle: 'Human + AI interface', x: 91, y: 36,
    layers: ['runtime', 'voice'],
    description: 'The browser keeps human intent, company evidence, proposed action, approval, and outcome in one visible workspace.',
    evidence: ['No browser-held gateway secret', 'Explicit approval state', 'Live structured UI events'],
  },
  {
    id: 'stream', code: 'SSE', title: 'Streaming runtime', subtitle: 'JWT · SSE · serverless', x: 70, y: 51,
    layers: ['runtime', 'voice'],
    description: 'Authenticated serverless routes proxy token streams and validated Xena UI events without exposing the gateway credential.',
    evidence: ['Server-sent event delivery', 'Server-side secret resolution', 'Warm-on-demand execution'],
  },
  {
    id: 'api', code: 'API', title: 'Operations gateway', subtitle: 'API Gateway · Lambda', x: 49, y: 51,
    layers: ['runtime', 'agent'],
    description: 'Operational read and write actions cross a dedicated HTTPS contract backed by Lambda, never direct cloud credentials.',
    evidence: ['Explicit CRUD surface', 'Lambda validation boundary', 'Lateral resource integration'],
  },
  {
    id: 'data', code: 'DB', title: 'Managed data', subtitle: 'DynamoDB · schemaless', x: 28, y: 51,
    layers: ['runtime'],
    description: 'Operational records remain in managed, access-controlled NoSQL stores. Agent context stays transient and separate.',
    evidence: ['On-demand NoSQL', 'Company-owned records', 'No agent-local business dataset'],
  },
  {
    id: 'guardrails', code: 'KEY', title: 'Secrets + IAM', subtitle: 'Encrypted · least privilege', x: 8.5, y: 51,
    layers: ['runtime', 'agent'],
    description: 'Recoverable secret material is encrypted in Secrets Manager while scoped IAM policies constrain every AWS action.',
    evidence: ['No public secret variables', 'Runtime secret retrieval', 'Resource-specific permissions'],
  },
  {
    id: 'agent-source', code: 'RC', title: 'RoyClaw repository', subtitle: 'Separate source boundary', x: 8.5, y: 84,
    layers: ['agent', 'delivery'],
    description: 'The gateway setup lives in a separate repository so its lifecycle and permissions remain independent from Xena.',
    evidence: ['Isolated deployment source', 'Fresh-instance configuration', 'Replaceable gateway lifecycle'],
  },
  {
    id: 'island', code: 'OC', title: 'OpenClaw island', subtitle: 'Isolated Lightsail gateway', x: 31, y: 84,
    layers: ['agent'],
    description: 'A disposable gateway island receives its configuration and publishes its rotating gateway key to Secrets Manager.',
    evidence: ['Separate compute boundary', 'No company data at rest', 'No agent OS command surface'],
  },
  {
    id: 'tools', code: 'SK', title: 'Skills + Xena tools', subtitle: 'Allowlisted capabilities', x: 55, y: 84,
    layers: ['agent'],
    description: 'Agents interact through specialized skills and proprietary Xena tools—not Bash, AWS CLI, or ambient infrastructure access.',
    evidence: ['Explicit tool contracts', 'Auditable API calls', 'No direct AWS credentials'],
  },
  {
    id: 'voice', code: 'VOX', title: 'STT + TTS', subtitle: 'Voice serverless routes', x: 79, y: 84,
    layers: ['voice'],
    description: 'Speech-to-text and text-to-speech travel through authenticated serverless endpoints and rejoin the active SSE experience.',
    evidence: ['Authenticated voice routes', 'Secret resolved server-side', 'Straight back to the live workspace'],
  },
  {
    id: 'systems', code: 'EXT', title: 'Company resources', subtitle: 'APIs · systems · workflows', x: 90, y: 69,
    layers: ['runtime', 'agent'],
    description: 'Lateral integrations remain behind governed APIs and tool contracts so agent capability never becomes cloud-wide access.',
    evidence: ['API-mediated actions', 'Company-specific connectors', 'Permissioned resource scope'],
  },
];

const routes: Array<{ id: string; d: string; layer: LayerId; duration: number; delay: number }> = [
  { id: 'source-pipeline', d: 'M90 88 C150 88 205 88 290 88', layer: 'delivery', duration: 3.8, delay: 0 },
  { id: 'pipeline-amplify', d: 'M290 88 C350 88 405 88 490 88', layer: 'delivery', duration: 3.6, delay: -1.2 },
  { id: 'amplify-operator', d: 'M490 88 C650 88 810 104 910 187', layer: 'delivery', duration: 4.8, delay: -2.1 },
  { id: 'identity-operator', d: 'M720 88 C805 88 865 120 910 187', layer: 'runtime', duration: 3.7, delay: -0.5 },
  { id: 'operator-stream', d: 'M910 187 C850 225 785 250 700 265', layer: 'runtime', duration: 3.9, delay: -1.1 },
  { id: 'stream-api', d: 'M700 265 C635 265 570 265 490 265', layer: 'runtime', duration: 3.3, delay: -2.3 },
  { id: 'api-data', d: 'M490 265 C420 265 355 265 280 265', layer: 'runtime', duration: 3.4, delay: -0.9 },
  { id: 'guard-api', d: 'M85 265 C215 205 355 210 490 265', layer: 'runtime', duration: 4.6, delay: -3 },
  { id: 'agent-source-island', d: 'M85 438 C155 438 235 438 310 438', layer: 'agent', duration: 3.8, delay: -0.8 },
  { id: 'island-secret', d: 'M310 438 C215 385 145 330 85 265', layer: 'agent', duration: 4.3, delay: -1.7 },
  { id: 'island-tools', d: 'M310 438 C385 438 470 438 550 438', layer: 'agent', duration: 3.6, delay: -2.5 },
  { id: 'tools-api', d: 'M550 438 C560 365 535 315 490 265', layer: 'agent', duration: 4.1, delay: -1.4 },
  { id: 'api-systems', d: 'M490 265 C700 275 850 315 940 360', layer: 'agent', duration: 5.1, delay: -3.4 },
  { id: 'voice-stream', d: 'M790 438 C790 365 760 310 700 265', layer: 'voice', duration: 4.2, delay: -1.3 },
  { id: 'voice-operator', d: 'M790 438 C895 390 930 295 910 187', layer: 'voice', duration: 4.9, delay: -3.2 },
];

export function ArchitectureScene() {
  const [activeLayer, setActiveLayer] = useState<LayerId>('runtime');
  const [selectedNodeId, setSelectedNodeId] = useState('stream');
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setActiveLayer((current) => {
        const index = layers.findIndex((layer) => layer.id === current);
        const next = layers[(index + 1) % layers.length];
        const nextNode = nodes.find((node) => node.layers.includes(next.id));
        if (nextNode) setSelectedNodeId(nextNode.id);
        return next.id;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const currentLayer = layers.find((layer) => layer.id === activeLayer) ?? layers[1];
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[5];
  const mobileNodes = useMemo(() => nodes.filter((node) => node.layers.includes(activeLayer)).slice(0, 6), [activeLayer]);

  const chooseLayer = (layer: LayerId) => {
    setActiveLayer(layer);
    setAutoPlay(false);
    const firstNode = nodes.find((node) => node.layers.includes(layer));
    if (firstNode) setSelectedNodeId(firstNode.id);
  };

  return (
    <section className={`${styles.scene} ${styles.architectureScene}`} aria-labelledby="architecture-title">
      <div className={styles.architectureTop}>
        <div>
          <div className={styles.kicker}><span /> Live system architecture</div>
          <h2 id="architecture-title">Built to deploy itself.<br />Designed to disappear when idle.</h2>
        </div>
        <p>
          Follow each packet from source control to human approval, serverless execution, company data,
          and the isolated agent gateway.
        </p>
      </div>

      <div className={styles.layerControls} role="tablist" aria-label="Architecture layers">
        {layers.map((layer) => (
          <button
            key={layer.id}
            className={activeLayer === layer.id ? styles.layerControlActive : ''}
            onClick={() => chooseLayer(layer.id)}
            type="button"
            role="tab"
            aria-selected={activeLayer === layer.id}
          >
            <span>{layer.number}</span>
            <strong>{layer.label}</strong>
          </button>
        ))}
        <button
          className={styles.autoPlayButton}
          onClick={() => setAutoPlay((current) => !current)}
          type="button"
          aria-pressed={autoPlay}
          aria-label={autoPlay ? 'Pause architecture animation' : 'Play architecture animation'}
        >
          {autoPlay ? <PauseIcon /> : <PlayIcon />}
          <span>{autoPlay ? 'Auto' : 'Paused'}</span>
        </button>
      </div>

      <div className={styles.architectureWorkspace}>
        <div className={styles.architectureMap}>
          <div className={styles.mapTopline}>
            <div><span className={styles.mapLiveDot} /> {currentLayer.headline}</div>
            <span>eu-central-1 · managed boundary</span>
          </div>

          <div className={styles.desktopArchitectureMap}>
            <div className={styles.cloudBoundary} aria-hidden="true"><span>XENA SERVERLESS APPLICATION PLANE</span></div>
            <div className={styles.islandBoundary} aria-hidden="true"><span>REPLACEABLE AGENT ISLAND</span></div>
            <svg className={styles.routePlane} viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="packetGlow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {routes.map((route) => {
                const active = route.layer === activeLayer;
                return (
                  <g key={route.id} className={active ? styles.routeActive : styles.routeInactive}>
                    <path id={route.id} d={route.d} className={styles.routeBase} />
                    <path d={route.d} className={styles.routeEnergy} />
                    {active && (
                      <circle r="3.6" className={styles.packet} filter="url(#packetGlow)">
                        <animateMotion
                          dur={`${route.duration}s`}
                          begin={`${route.delay}s`}
                          repeatCount="indefinite"
                          path={route.d}
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {nodes.map((node) => {
              const active = node.layers.includes(activeLayer);
              const selected = selectedNode.id === node.id;
              const nodeStyle = {
                '--node-x': `${node.x}%`,
                '--node-y': `${node.y}%`,
              } as CSSProperties;
              return (
                <button
                  key={node.id}
                  className={`${styles.archNode} ${active ? styles.archNodeActive : styles.archNodeDimmed} ${selected ? styles.archNodeSelected : ''}`}
                  style={nodeStyle}
                  onClick={() => setSelectedNodeId(node.id)}
                  type="button"
                  aria-pressed={selected}
                >
                  <span className={styles.archNodeCode}>{node.code}</span>
                  <span className={styles.archNodeCopy}><strong>{node.title}</strong><small>{node.subtitle}</small></span>
                  <i />
                </button>
              );
            })}
          </div>

          <div className={styles.mobileArchitectureMap}>
            {mobileNodes.map((node, index) => (
              <div key={node.id} className={styles.mobileNodeWrap}>
                <button
                  className={selectedNode.id === node.id ? styles.mobileNodeActive : ''}
                  onClick={() => setSelectedNodeId(node.id)}
                  type="button"
                >
                  <span>{node.code}</span>
                  <div><strong>{node.title}</strong><small>{node.subtitle}</small></div>
                </button>
                {index < mobileNodes.length - 1 && <i><DownIcon /></i>}
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.architectureDetail} aria-live="polite">
          <div className={styles.detailIndex}>{selectedNode.code}</div>
          <div className={styles.detailEyebrow}>Selected component</div>
          <h3>{selectedNode.title}</h3>
          <p>{selectedNode.description}</p>
          <div className={styles.detailEvidence}>
            {selectedNode.evidence.map((item) => <span key={item}><CheckIcon /> {item}</span>)}
          </div>
          <div className={styles.detailLayerNote}>
            <span>{currentLayer.number}</span>
            <div><strong>{currentLayer.label}</strong><small>{currentLayer.summary}</small></div>
          </div>
        </aside>
      </div>

      <div className={styles.architectureFacts}>
        <span><i /> Serverless application + data plane</span>
        <span><i /> Transient agent context</span>
        <span><i /> No agent shell surface</span>
        <span><i /> Repository-defined recovery</span>
      </div>

      <div className={styles.sceneIndex} aria-hidden="true"><span>03</span><i /><span>04</span></div>
    </section>
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PauseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 8 5-8 5V5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

function DownIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v12m-4-4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
