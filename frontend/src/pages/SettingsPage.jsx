import { useNavigate } from "react-router-dom";
import { Settings, User, LogOut, ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const { user, logout, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth");
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Settings size={20} className="text-gray-400" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <User size={20} className="text-gray-400" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || user?.email?.split("@")[0] || "yo user"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10">
            <button
              className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <User size={17} className="text-gray-500" />
              <div>
                <p className="text-sm text-gray-300">Account</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Manage your account
                </p>
              </div>
            </button>
          </div>

          <div className="border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-red-500/[0.06] transition-colors"
            >
              <LogOut size={17} className="text-gray-500" />
              <div>
                <p className="text-sm text-gray-300">Log out</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Sign out of yo
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}