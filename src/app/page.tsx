import styles from "./page.module.css";
import MainElement from "@/conponents/MainElement";

export default function Home() {
    return (
        <>
            <div className={styles.titleBlock}>
                <div className={styles.titleUnderGlow}></div>
                <h1 className={styles.title}>Вітаємо в "Enonym"</h1>
            </div>
            <MainElement/>
        </>
    );
}
