import type { Metadata } from "next";
import { GlobalFeed } from "@/components/GlobalFeed/GlobalFeed";
import { Section } from "@/components/Section/Section";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Feed | Rewind",
};

export default function FeedPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Feed</h1>
      <Section title="Atividade de quem você segue">
        <GlobalFeed />
      </Section>
    </div>
  );
}
