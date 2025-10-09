import type {Metadata} from "next";
import "./globals.css";
import styles from "@/app/page.module.css";
import Footer from "@/conponents/Footer";

import {Roboto} from 'next/font/google';

const roboto = Roboto({
    weight: ['400', '500', '600'],
    subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
    title: "Enónym",
    description: "Anonymous chat for ukrainians in Denmark",
    icons: {
        icon: '/icons/favicon_icon.svg',
        apple: '/icons/favicon_icon.svg',
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html className={roboto.className} lang="en">
        <body>
        <div className={styles.page}>
            <main className={styles.main}>
                {children}
            </main>
            <footer className={styles.footer}>
                <Footer/>
            </footer>
        </div>
        </body>
        </html>
    );
}
