import styles from "./page.module.css";
import MainElement from "@/conponents/MainElement";

export default function Home() {
    return (
        <>
            <div className={styles.titleBlock}>
                <div className={styles.titleUnderGlow}></div>
                <h1 className={styles.title}>Enonym</h1>
                <p className={styles.subtitle}>Анонімний чат для українців в Данії</p>
            </div>
            <MainElement/>
        </>
    );
}
