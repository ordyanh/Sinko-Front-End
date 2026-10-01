import { useEffect } from "react";
import { useNavigate } from "react-router";
import { signOut } from "~/shared/lib/indexed-db";

export default function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void signOut().finally(() => navigate("/login", { replace: true }));
  }, [navigate]);

  return null;
}
