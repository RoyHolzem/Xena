import type { CSSProperties } from 'react';
import styles from '../chat-shell.module.css';
import { cn } from '../chat-utils';
import type { AvatarState } from '../chat-types';

type AvatarStageProps = {
  appName: string;
  assistantName: string;
  avatarState: AvatarState;
  statusText: string;
  pointerStyle: CSSProperties;
};

export function AvatarStage({
  appName,
  assistantName,
  avatarState,
  statusText,
  pointerStyle
}: AvatarStageProps) {
  return (
    <section className={styles.stagePanel} aria-label={`${assistantName} presence stage`}>
      <div className={styles.stageHeader}>
        <div>
          <div className={styles.panelEyebrow}>Synthetic presence</div>
          <h1 className={styles.stageTitle}>{appName}</h1>
        </div>
        <div className={styles.stateBadge}>{avatarState}</div>
      </div>

      <div className={styles.stageScene}>
        <div className={styles.hudPanelTop}>
          <span className={styles.hudLabel}>Neural state</span>
          <strong>{statusText}</strong>
        </div>

        <div className={styles.hudPanelBottom}>
          <span className={styles.hudLabel}>Route</span>
          <strong>browser to gateway</strong>
        </div>

        <div className={styles.avatarStage} style={pointerStyle}>
          <div className={styles.avatarHalo} />
          <div className={styles.avatarBackdrop} />
          <div className={styles.orbitLarge} />
          <div className={styles.orbitSmall} />

          <div className={cn(styles.avatarFrame, styles[avatarState])}>
            <div className={styles.energyVeil} />
            <div className={styles.avatarCrown}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.avatarHead}>
              <div className={styles.headShell} />
              <div className={styles.facePlate}>
                <div className={styles.visor}>
                  <span className={styles.visorGlow} />
                  <span className={styles.visorScan} />
                </div>
                <div className={styles.cheekLines}>
                  <span />
                  <span />
                </div>
                <div className={styles.mouthPanel}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className={styles.templeLeft} />
              <div className={styles.templeRight} />
              <div className={styles.dataFragments}>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className={styles.neck}>
              <span />
              <span />
              <span />
            </div>

            <div className={styles.avatarTorso}>
              <div className={styles.collarArc} />
              <div className={styles.shoulderLeft} />
              <div className={styles.shoulderRight} />
              <div className={styles.chestShell}>
                <div className={styles.coreColumn}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.corePulse} />
                <div className={styles.circuitGrid}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className={styles.avatarReflection} />
          </div>
        </div>
      </div>
    </section>
  );
}
