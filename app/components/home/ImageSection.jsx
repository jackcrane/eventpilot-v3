import { Browser } from "../browser/Browser";
import styles from "./home.module.css";
import { Section } from "./Section";

export const ImageSection = ({ children, src, isNode = false }) => {
  return (
    <div className={styles.imageSection}>
      <Section>
        {isNode ? (
          <div className={styles.svgContainer}>{src}</div>
        ) : (
          <Browser>
            <img src={src} className={styles.imageSection__image} />
          </Browser>
        )}
      </Section>
      <div
        className={styles.imageSection__content}
        style={{
          ...(isNode ? { marginTop: 48 } : {}),
        }}
      >
        <Section>{children}</Section>
      </div>
    </div>
  );
};
