import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Award,
  Clock,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { title: "Courses", path: "/courses" },
  { title: "AI Assistant", path: "/ai" },
  { title: "Compiler", path: "/compiler" },
  { title: "Community", path: "/community" },
  { title: "Leaderboard", path: "/leaderboard" },
  { title: "Credential", path: "/credential-verify" },
  { title: "Contact", path: "/contact" },
];

const accountLinks = (isAdmin) => {
  const links = [
    { title: "Profile", path: "/profile", icon: User },
    { title: "My Certifications", path: "/certificates", icon: Award },
    { title: "Attempts", path: "/attempts", icon: Clock },
    { title: "Connections", path: "/connections", icon: Users },
  ];
  if (isAdmin) links.push({ title: "Admin Panel", path: "/admin", icon: Settings, admin: true });
  return links;
};

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950";

export const Navbar = () => {
  const { logout, isAuthenticated, userFirstName, userEmail, role } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownTriggerRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const isAdmin =
    (role && role.toUpperCase() === "ADMIN") || userEmail === "bitecodes.global@gmail.com";

  const go = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        event.target.closest?.("#mobile-menu-button") === null
      ) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // A collapsed drawer is clipped, not removed: without `inert` its links stay in
  // the tab order and read out to screen readers while invisible.
  useEffect(() => {
    if (mobileMenuRef.current) mobileMenuRef.current.inert = !isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  // The dropdown announces itself as a menu, so it has to behave like one:
  // arrows walk the items, Escape closes it and hands focus back to the trigger.
  const moveInMenu = useCallback((delta) => {
    const items = Array.from(dropdownRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    const next =
      current === -1
        ? delta > 0
          ? 0
          : items.length - 1
        : (current + delta + items.length) % items.length;
    items[next].focus();
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        dropdownTriggerRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveInMenu(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveInMenu(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDropdownOpen, moveInMenu]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  const initials = (userFirstName || userEmail || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-md dark:border-gray-800/70 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          type="button"
          onClick={() => go("/")}
          aria-label="Learn Without Limits — home"
          className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg ${focusRing}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-base font-extrabold text-white shadow-sm">
            L
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Learn Without Limits<span className="text-indigo-600 dark:text-indigo-400">.</span>
          </span>
        </button>

        {/* Centered segmented navigation (desktop) */}
        <div className="hidden items-center gap-1 rounded-full border border-gray-200/80 bg-gray-100/70 p-1 lg:flex dark:border-gray-700/60 dark:bg-gray-800/50">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end
              className={({ isActive }) =>
                [
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  focusRing,
                  isActive
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-gray-950 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
                ].join(" ")
              }
            >
              {link.title}
            </NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle className={focusRing} />

          {isAuthenticated ? (
            <div className="relative hidden lg:block" ref={dropdownRef}>
              <button
                ref={dropdownTriggerRef}
                type="button"
                onClick={() => setIsDropdownOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (!isDropdownOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                    event.preventDefault();
                    setIsDropdownOpen(true);
                    requestAnimationFrame(() => moveInMenu(event.key === "ArrowDown" ? 1 : -1));
                  }
                }}
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
                aria-controls="account-menu"
                aria-label="Account menu"
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                  {initials}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div
                  id="account-menu"
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {userFirstName || "Your account"}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                  </div>
                  <div className="py-1">
                    {accountLinks(isAdmin).map(({ title, path, icon: Icon, admin }) => (
                      <button
                        key={path}
                        role="menuitem"
                        onClick={() => go(path)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          admin
                            ? "font-medium text-purple-600 dark:text-purple-400"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            admin
                              ? "text-purple-500 dark:text-purple-400"
                              : "text-indigo-500 dark:text-indigo-400"
                          }
                        />
                        {title}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 py-1 dark:border-gray-800">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <LogOut size={18} />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => go("/login")}
              className={`hidden rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] lg:inline-flex ${focusRing}`}
            >
              Login / Signup
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            id="mobile-menu-button"
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className={`inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800 ${focusRing}`}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        ref={mobileMenuRef}
        className={`border-t border-gray-100 bg-white transition-[max-height,opacity] duration-300 lg:hidden dark:border-gray-800 dark:bg-gray-950 ${
          isMobileMenuOpen ? "max-h-[80vh] overflow-y-auto opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="space-y-1 px-4 py-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                [
                  "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800",
                ].join(" ")
              }
            >
              {link.title}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          {isAuthenticated ? (
            <div className="space-y-1">
              <p className="px-4 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Hi, {userFirstName || "there"}
              </p>
              {accountLinks(isAdmin).map(({ title, path, icon: Icon, admin }) => (
                <button
                  key={path}
                  onClick={() => go(path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    admin
                      ? "font-medium text-purple-600 dark:text-purple-400"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <Icon size={18} className={admin ? "text-purple-500" : "text-indigo-500 dark:text-indigo-400"} />
                  {title}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => go("/login")}
              className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-center text-base font-semibold text-white shadow-sm"
            >
              Login / Signup
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
