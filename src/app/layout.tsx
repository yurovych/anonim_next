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
    title: "Enonym - Анонімний чат для українців Данії.",
    description: "Enonym це чат для анонімного спілкування українців та нових знайомств в Данії.",
    icons: {
        icon: '/icons/favicon_icon.svg',
        apple: '/icons/favicon_icon.svg',
    },
    metadataBase: new URL('https://enonym.com'),
    openGraph: {
        title: "Enonym - Анонімний чат для українців Данії.",
        description: "Заводь нові знайомства з Enonym ",
        url: "https://enonym.com",
        type: "website",
        images: [
            {
                url: "/images/ceo_image.png",
                width: 400,
                height: 400,
                alt: "Enonym - Анонімний чат",
            },
        ],
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
