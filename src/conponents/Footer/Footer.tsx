import styles from './footerStyles.module.css'

const Footer = () => {
    return (
        <div className={styles.footerContainer}>
            <a href="mailto:volodiayurovych@gmail.com"
               className={`${styles.textContent} ${styles.link}`}
            >
                volodiayurovych@gmail.com
            </a>
            <p className={styles.textContent}>
                2025 Enónym. Copyright ©
            </p>
        </div>
    );
};

export default Footer;