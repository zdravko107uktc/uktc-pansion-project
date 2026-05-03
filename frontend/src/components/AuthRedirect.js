import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api/auth";

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (currentUser?.role === "student") {
          navigate("/home");
          return;
        }

        if (currentUser?.role === "admin" || currentUser?.role === "counselor") {
          navigate("/admin");
          return;
        }
      } catch {
        // fall through to login redirect below
      }

      localStorage.removeItem("token");
      navigate("/login");
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Зареждане...</p>
    </div>
  );
};

export default AuthRedirect;
