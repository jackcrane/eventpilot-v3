import styles from "./home.module.css";

export const Section = ({ children, ...props }) => {
  return (
    <div className={styles.section} {...props}>
      {children}
    </div>
  );
};
