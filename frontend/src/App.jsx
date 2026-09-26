import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppPage from "./pages/AppPage";
import StudyApp from "./pages/StudyApp";
import Loading from "./pages/Loading";
import AuthPage from "./pages/AuthPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/loading" element={<Loading />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <StudyApp />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}