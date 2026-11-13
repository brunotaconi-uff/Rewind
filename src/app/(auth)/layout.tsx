import Image from 'next/image';
import styles from './layout.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        <div className={styles.formWrapper}>
          {children}
        </div>
      </div>
      <div className={styles.rightColumn}>
        <Image
          src="/mosaico.png"
          alt="Mosaico de álbuns musicais"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className={styles.backgroundImage}
          priority
        />
        <div className={styles.vignetteOverlay} />
      </div>
    </div>
  );
}