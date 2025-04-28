import { Breadcrumb, Typography } from "tabler-react-2";
import { useLocation } from "react-router-dom";
const { Link } = Typography;

const switchPathPieceForDisplay = (pathPiece) => {
  switch (pathPiece) {
    case "settings":
      return "Settings";
    case "me":
      return "Profile";
    case "home":
      return "Home";
    default:
      return pathPiece;
  }
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const path = location.pathname.split("/");
  const paths = path.filter((p) => p !== "");
  paths.unshift("home");

  return (
    <Breadcrumb>
      {paths.map((path, index) => {
        return (
          <Breadcrumb.Item key={index}>
            {index === paths.length - 1 ? (
              <span>{switchPathPieceForDisplay(path)}</span>
            ) : (
              <Link href={`/${path}`}>{switchPathPieceForDisplay(path)}</Link>
            )}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
};
