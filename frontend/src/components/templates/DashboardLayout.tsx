import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Activity,
  FileText,
  CreditCard,
  Pill,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ClipboardList,
  FlaskConical,
  MonitorSmartphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlerts } from '../../shared/hooks/useAlerts';
import { ANIMATION } from '../../shared/utils/constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeBarRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isInitialMount = useRef(true);

  useAlerts();

  // Content fade-in on mount and route changes
  useEffect(() => {
    if (!contentRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const duration = isInitialMount.current
      ? ANIMATION.LAYOUT.INITIAL_DURATION
      : ANIMATION.LAYOUT.ROUTE_DURATION;
    isInitialMount.current = false;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: ANIMATION.LAYOUT.INITIAL_Y },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: ANIMATION.EASING.GSAP,
        }
      );
    }, contentRef);

    return () => ctx.revert();
  }, [location.pathname]);

  // Sidebar active indicator animation
  useEffect(() => {
    const activeLink = navRef.current?.querySelector('a.active') as HTMLElement | null;
    if (!activeLink || !activeBarRef.current) return;

    const top = activeLink.offsetTop;
    const height = activeLink.offsetHeight;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(activeBarRef.current, { y: top, height, opacity: 1 });
      } else {
        gsap.to(activeBarRef.current, {
          y: top,
          height,
          opacity: 1,
          duration: ANIMATION.ACTIVE_BAR.DURATION,
          ease: ANIMATION.EASING.GSAP,
        });
      }
    });

    return () => ctx.revert();
  }, [location.pathname]);

  // Mobile sidebar open/close animation
  useEffect(() => {
    if (!mobileSidebarRef.current || !overlayRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (mobileOpen) {
        overlayRef.current!.style.display = 'block';
        if (prefersReducedMotion) {
          gsap.set(mobileSidebarRef.current, { x: '0%' });
          gsap.set(overlayRef.current, { opacity: 1 });
        } else {
          gsap.to(mobileSidebarRef.current, {
            x: '0%',
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
          gsap.to(overlayRef.current, {
            opacity: 1,
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
        }
      } else {
        if (prefersReducedMotion) {
          gsap.set(mobileSidebarRef.current, { x: '-100%' });
          gsap.set(overlayRef.current, { opacity: 0 });
          overlayRef.current!.style.display = 'none';
        } else {
          gsap.to(mobileSidebarRef.current, {
            x: '-100%',
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
          gsap.to(overlayRef.current, {
            opacity: 0,
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
            onComplete: () => {
              if (overlayRef.current) overlayRef.current.style.display = 'none';
            },
          });
        }
      }
    });

    return () => ctx.revert();
  }, [mobileOpen]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Patients', path: '/patients', icon: Users },
    { label: 'Doctors', path: '/doctors', icon: Stethoscope },
    { label: 'Appointments', path: '/appointments', icon: Calendar },
    { label: 'Vitals', path: '/vitals', icon: Activity },
    { label: 'Prescriptions', path: '/prescriptions', icon: FileText },
    { label: 'Billing', path: '/billing', icon: CreditCard },
    { label: 'Pharmacy', path: '/pharmacy', icon: Pill },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <div
        ref={overlayRef}
        onClick={() => setMobileOpen(false)}
        className="fixed inset-0 bg-textPrimary/40 z-40 md:hidden"
        style={{ display: 'none', opacity: 0 }}
      />

      {/* Mobile sidebar */}
      <aside
        ref={mobileSidebarRef}
        className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border z-50 flex flex-col md:hidden"
        style={{ transform: 'translateX(-100%)' }}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
              +
            </div>
            <span className="font-bold text-lg text-textPrimary tracking-tight">MedSystem</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-textSecondary hover:text-textPrimary"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'active bg-primary/10 text-primary font-semibold'
                      : 'text-textSecondary hover:bg-slate-50 hover:text-textPrimary'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
              +
            </div>
            <span className="font-bold text-lg text-textPrimary tracking-tight">MedSystem</span>
          </div>
        </div>
        <nav ref={navRef} className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Active 2px indicator bar */}
          <div
            ref={activeBarRef}
            className="absolute left-0 w-[2px] bg-primary rounded-r pointer-events-none"
            style={{ top: 0, height: 0, opacity: 0 }}
          />
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'active bg-primary/10 text-primary font-semibold'
                      : 'text-textSecondary hover:bg-slate-50 hover:text-textPrimary'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-textSecondary hover:text-textPrimary rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">
              Clinical Workspace
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-border flex items-center justify-center text-textSecondary">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-textPrimary">
                  {user?.name || user?.username || 'Staff Member'}
                </p>
                <p className="text-textSecondary capitalize">{user?.role || 'Clinical'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-xs font-medium text-textSecondary hover:text-danger px-3 py-1.5 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Logout
            </button>
          </div>
        </header>
        <main ref={contentRef} className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
