import styles from './footerStyles.module.css'

const Footer = () => {
    return (
        <div className={styles.footerContainer}>
            <p className={styles.textContent}>
                2025 Enonym. Copyright ©
            </p>
        </div>
    );
};

export default Footer;