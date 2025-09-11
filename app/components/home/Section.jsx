import styles from "./home.module.css";

export const Section = ({ children }) => {
  return <div className={styles.section}>{children}</div>;
};
