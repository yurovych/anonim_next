import type {Metadata} from "next";
import "./globals.css";
import styles from "@/app/page.module.css";


export const metadata: Metadata = {
    title: "Enónym",
    description: "Anonymous chart for ukrainians in Denmark",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        <div className={styles.page}>
            <main className={styles.main}>
                {children}
            </main>
            <footer className={styles.footer}>

            </footer>
        </div>
        </body>
        </html>
    );
}
