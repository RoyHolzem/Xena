import styles from '../chat-shell.module.css';

export function AmbientFx() {
  return (
    <>
      <div className={styles.noise} />
      <div className={styles.mesh} />
      <div className={styles.grid} />
      <div className={styles.particleField} />
      <div className={styles.codeCurtain} />
      <div className={styles.lightSweep} />
    </>
  );
}
