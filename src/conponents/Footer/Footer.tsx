import styles from './footerStyles.module.css';

const Footer = () => {
  return (
    <div className={styles.footerContainer}>
      <a
        href="mailto:enonymchat@gmail.com"
        className={`${styles.textContent} ${styles.link}`}
      >
        enonymchat@gmail.com
      </a>
      <p className={styles.textContent}>2025 Enonym. Copyright ©</p>
    </div>
  );
};

export default Footer;
