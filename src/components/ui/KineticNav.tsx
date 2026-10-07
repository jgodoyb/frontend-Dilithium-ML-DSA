import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Menu, X } from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { useTransferNotification } from "@/contexts/TransferNotificationContext";

// Register GSAP Plugins safely
if (typeof window !== "undefined") {
    try {
        gsap.registerPlugin(CustomEase);
    } catch (e) {
        console.warn("GSAP CustomEase initialization fallback", e);
    }
}

export interface KineticNavProps {
    isOpen?: boolean;
    onClose?: () => void;
    onToggle?: () => void;
    hideDefaultHeaderButton?: boolean;
    hasUnreadTransfers?: boolean;
}

export function Component({ isOpen: externalIsOpen, onClose, onToggle, hideDefaultHeaderButton, hasUnreadTransfers }: KineticNavProps = {}) {
    return <KineticNav isOpen={externalIsOpen} onClose={onClose} onToggle={onToggle} hideDefaultHeaderButton={hideDefaultHeaderButton} hasUnreadTransfers={hasUnreadTransfers} />;
}

export function KineticNav({
    isOpen: externalIsOpen,
    onClose,
    onToggle,
    hideDefaultHeaderButton = false,
    hasUnreadTransfers: externalHasUnreadTransfers,
}: KineticNavProps = {}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const { isAuthenticated, user, logout } = useMockAuth();
    const { hasUnreadTransfers: contextHasUnreadTransfers } = useTransferNotification();
    const hasUnreadTransfers = externalHasUnreadTransfers !== undefined
        ? externalHasUnreadTransfers
        : contextHasUnreadTransfers;
    const navigate = useNavigate();

    const isMenuOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

    const toggleMenu = () => {
        if (onToggle) {
            onToggle();
        } else {
            setInternalIsOpen((prev) => !prev);
        }
    };

    const closeMenu = () => {
        if (onClose) {
            onClose();
        } else {
            setInternalIsOpen(false);
        }
    };

    // Initial Setup & Shape Hover Effects via GSAP
    useEffect(() => {
        if (!containerRef.current) return;

        try {
            if (!gsap.parseEase("main")) {
                CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
                gsap.defaults({ ease: "main", duration: 0.7 });
            }
        } catch (e) {
            gsap.defaults({ ease: "power2.out", duration: 0.7 });
        }

        const ctx = gsap.context(() => {
            const menuItems = containerRef.current!.querySelectorAll(".menu-list-item[data-shape]");
            const shapesContainer = containerRef.current!.querySelector(".ambient-background-shapes");

            menuItems.forEach((item) => {
                const shapeIndex = item.getAttribute("data-shape");
                const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${shapeIndex}`) : null;
                if (!shape) return;

                const shapeEls = shape.querySelectorAll(".shape-element");

                const onEnter = () => {
                    if (shapesContainer) {
                        shapesContainer.querySelectorAll(".bg-shape").forEach((s) => s.classList.remove("active"));
                    }
                    shape.classList.add("active");

                    gsap.fromTo(
                        shapeEls,
                        { scale: 0.5, opacity: 0, rotation: -10 },
                        { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", overwrite: "auto" }
                    );
                };

                const onLeave = () => {
                    gsap.to(shapeEls, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.3,
                        ease: "power2.in",
                        onComplete: () => shape.classList.remove("active"),
                        overwrite: "auto",
                    });
                };

                item.addEventListener("mouseenter", onEnter);
                item.addEventListener("mouseleave", onLeave);

                (item as any)._cleanup = () => {
                    item.removeEventListener("mouseenter", onEnter);
                    item.removeEventListener("mouseleave", onLeave);
                };
            });
        }, containerRef);

        return () => {
            ctx.revert();
            if (containerRef.current) {
                const items = containerRef.current.querySelectorAll(".menu-list-item[data-shape]");
                items.forEach((item: any) => item._cleanup && item._cleanup());
            }
        };
    }, []);

    // Menu Open/Close GSAP Timeline Effect
    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            const navWrap = containerRef.current!.querySelector(".nav-overlay-wrapper");
            const menu = containerRef.current!.querySelector(".menu-content");
            const overlay = containerRef.current!.querySelector(".overlay");
            const bgPanels = containerRef.current!.querySelectorAll(".backdrop-layer");
            const menuLinks = containerRef.current!.querySelectorAll(".nav-link");
            const fadeTargets = containerRef.current!.querySelectorAll("[data-menu-fade]");

            const tl = gsap.timeline();

            if (isMenuOpen) {
                if (navWrap) navWrap.setAttribute("data-nav", "open");

                tl.set(navWrap, { display: "block" })
                    .set(menu, { xPercent: 0 }, "<")
                    .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "<")
                    .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
                    .fromTo(
                        menuLinks,
                        { yPercent: 140, rotate: 10 },
                        { yPercent: 0, rotate: 0, stagger: 0.05, duration: 0.5 },
                        "<+=0.35"
                    );

                if (fadeTargets.length) {
                    tl.fromTo(
                        fadeTargets,
                        { autoAlpha: 0, yPercent: 50 },
                        { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: "all" },
                        "<+=0.2"
                    );
                }
            } else {
                if (navWrap) navWrap.setAttribute("data-nav", "closed");

                tl.to(overlay, { autoAlpha: 0, duration: 0.3 })
                    .to(menu, { xPercent: 120, duration: 0.4, ease: "power3.in" }, "<")
                    .set(navWrap, { display: "none" });
            }
        }, containerRef);

        return () => ctx.revert();
    }, [isMenuOpen]);

    // keydown Escape handling
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isMenuOpen) {
                closeMenu();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isMenuOpen]);

    // Concise single-word routes defined for Sterling Gate Kinetic Menu
    const routes = [
        { label: "INICIO", path: "/", shape: "1" },
        { label: "TECNOLOGÍA", path: "/technology", shape: "2" },
        { label: "VERIFICAR", path: "/verify", shape: "3" },
        ...(isAuthenticated
            ? [
                { label: "FIRMAR", path: "/signatures", shape: "4" },
                { label: "BUZÓN", path: "/transfers", shape: "5" },
            ]
            : []),
        { label: "PLANES", path: "/plans", shape: "4" },
        { label: "AUTOR", path: "/architect", shape: "1" },
        ...(isAuthenticated
            ? [
                { label: "IDENTIDAD", path: "/identity", shape: "2" },
            ]
            : []),
    ];

    return (
        <div ref={containerRef} className="relative z-50">
            {/* Scoped Sterling Gate Kinetic Styles */}
            <style>{`
        .fullscreen-menu-container {
          position: relative;
          z-index: 50;
        }
        .nav-overlay-wrapper[data-nav="open"] {
          display: block !important;
          pointer-events: auto !important;
        }
        .nav-overlay-wrapper[data-nav="closed"] {
          display: none !important;
          pointer-events: none !important;
        }
        .overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          z-index: 40;
        }
        .menu-content {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 100%;
          max-width: 480px;
          background-color: #090d16;
          z-index: 50;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-shadow: -15px 0 40px rgba(0, 0, 0, 0.85);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }
        .menu-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .backdrop-layer {
          position: absolute;
          inset: 0;
          background-color: #090d16;
        }
        .backdrop-layer.first {
          background: linear-gradient(180deg, rgba(14, 116, 144, 0.15), transparent);
        }
        .backdrop-layer.second {
          background-color: rgba(15, 23, 42, 0.95);
        }
        .ambient-background-shapes {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        .bg-shape {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .bg-shape.active {
          opacity: 1;
        }
        .menu-content-wrapper {
          position: relative;
          z-index: 10;
          padding: 2.25rem 1.5rem 1.25rem 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .menu-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .menu-list-item {
          position: relative;
          overflow: hidden;
        }
        .nav-link {
          position: relative;
          display: block;
          padding: 0.5rem 0.85rem;
          overflow: hidden;
          border-radius: 0.5rem;
          text-decoration: none;
          cursor: pointer;
          user-select: none;
        }
        .nav-link-text {
          position: relative;
          z-index: 2;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 800;
          font-size: 1.65rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          text-transform: uppercase;
          color: #ffffff;
          white-space: nowrap;
          transition: color 0.3s ease;
        }
        @media (min-width: 640px) {
          .nav-link-text {
            font-size: 2.15rem;
          }
        }
        .nav-link-hover-bg {
          position: absolute;
          inset: 0;
          background-color: #ffffff;
          transform: translateY(101%);
          transition: transform 0.35s cubic-bezier(0.65, 0.01, 0.05, 0.99);
          z-index: 1;
          border-radius: 0.5rem;
        }
        .nav-link:hover .nav-link-hover-bg {
          transform: translateY(0);
        }
        .nav-link:hover .nav-link-text {
          color: #000000;
        }
      `}</style>

            {/* Default Header Activator Button */}
            {!hideDefaultHeaderButton && (
                <div className="site-header-wrapper pointer-events-auto">
                    <header className="header">
                        <div className="container is--full">
                            <nav className="nav-row flex items-center justify-end">
                                <button
                                    role="button"
                                    className="relative p-2 text-neutral-300 hover:text-white transition-colors duration-200 focus:outline-none rounded-lg hover:bg-white/5"
                                    onClick={toggleMenu}
                                    aria-label={isMenuOpen ? "Cerrar Menú" : "Abrir Menú"}
                                >
                                    <div className="relative w-5 h-5 flex items-center justify-center">
                                        {isMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-neutral-200" />}
                                        {hasUnreadTransfers && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-neutral-950 animate-pulse pointer-events-none" />
                                        )}
                                    </div>
                                </button>
                            </nav>
                        </div>
                    </header>
                </div>
            )}

            {/* Kinetic Panel Section */}
            <section className="fullscreen-menu-container">
                <div data-nav="closed" className="nav-overlay-wrapper fixed inset-0 z-50 hidden pointer-events-none">
                    {/* Overlay */}
                    <div className="overlay" onClick={closeMenu} />

                    {/* Sterling Gate Kinetic Menu Content */}
                    <nav className="menu-content">
                        <div className="menu-bg">
                            <div className="backdrop-layer first" />
                            <div className="backdrop-layer second" />
                            <div className="backdrop-layer" />

                            {/* Ambient background shapes connected to data-shape */}
                            <div className="ambient-background-shapes">
                                {/* Shape 1: Floating circles */}
                                <svg className="bg-shape bg-shape-1" viewBox="0 0 400 400" fill="none">
                                    <circle className="shape-element" cx="80" cy="120" r="40" fill="rgba(6,182,212,0.25)" />
                                    <circle className="shape-element" cx="300" cy="80" r="60" fill="rgba(14,116,144,0.2)" />
                                    <circle className="shape-element" cx="200" cy="300" r="80" fill="rgba(20,184,166,0.15)" />
                                    <circle className="shape-element" cx="350" cy="280" r="30" fill="rgba(6,182,212,0.2)" />
                                </svg>

                                {/* Shape 2: Wave pattern */}
                                <svg className="bg-shape bg-shape-2" viewBox="0 0 400 400" fill="none">
                                    <path className="shape-element" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(6,182,212,0.3)" strokeWidth="60" fill="none" />
                                    <path className="shape-element" d="M0 280 Q100 180, 200 280 T 400 280" stroke="rgba(20,184,166,0.2)" strokeWidth="40" fill="none" />
                                </svg>

                                {/* Shape 3: Grid dots */}
                                <svg className="bg-shape bg-shape-3" viewBox="0 0 400 400" fill="none">
                                    <circle className="shape-element" cx="50" cy="50" r="8" fill="rgba(6,182,212,0.4)" />
                                    <circle className="shape-element" cx="150" cy="50" r="8" fill="rgba(14,116,144,0.4)" />
                                    <circle className="shape-element" cx="250" cy="50" r="8" fill="rgba(20,184,166,0.4)" />
                                    <circle className="shape-element" cx="350" cy="50" r="8" fill="rgba(6,182,212,0.4)" />
                                    <circle className="shape-element" cx="100" cy="150" r="12" fill="rgba(14,116,144,0.3)" />
                                    <circle className="shape-element" cx="200" cy="150" r="12" fill="rgba(20,184,166,0.3)" />
                                    <circle className="shape-element" cx="300" cy="150" r="12" fill="rgba(6,182,212,0.3)" />
                                </svg>

                                {/* Shape 4: Organic blobs */}
                                <svg className="bg-shape bg-shape-4" viewBox="0 0 400 400" fill="none">
                                    <path className="shape-element" d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100" fill="rgba(6,182,212,0.2)" />
                                    <path className="shape-element" d="M250 200 Q300 150, 350 200 Q400 250, 350 300 Q300 350, 250 300 Q200 250, 250 200" fill="rgba(20,184,166,0.15)" />
                                </svg>

                                {/* Shape 5: Diagonal lines */}
                                <svg className="bg-shape bg-shape-5" viewBox="0 0 400 400" fill="none">
                                    <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(6,182,212,0.25)" strokeWidth="30" />
                                    <line className="shape-element" x1="100" y1="0" x2="400" y2="300" stroke="rgba(14,116,144,0.2)" strokeWidth="25" />
                                    <line className="shape-element" x1="200" y1="0" x2="400" y2="200" stroke="rgba(20,184,166,0.15)" strokeWidth="20" />
                                </svg>
                            </div>
                        </div>

                        {/* Concise Single-Word Menu Links List */}
                        <div className="menu-content-wrapper">
                            <ul className="menu-list">
                                {routes.map((route) => {
                                    const isTransfers = route.path === "/transfers" || route.path === "/dashboard/transfers";
                                    return (
                                        <li key={route.path} className="menu-list-item" data-shape={route.shape}>
                                            <Link to={route.path} onClick={closeMenu} className="nav-link">
                                                <span className="nav-link-text inline-flex items-center gap-2.5">
                                                    {route.label}
                                                    {isTransfers && hasUnreadTransfers && (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-neutral-950 animate-pulse inline-block shrink-0" />
                                                    )}
                                                </span>
                                                <div className="nav-link-hover-bg" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Sobriety Plain-Text Bottom Auth Section */}
                        <div className="relative z-10 px-6 py-5 border-t border-white/10 bg-slate-950/90" data-menu-fade>
                            {isAuthenticated ? (
                                <div className="flex items-center justify-between gap-4">
                                    <div className="overflow-hidden">
                                        <p className="font-sans text-xs text-white font-semibold uppercase tracking-normal truncate">
                                            {user?.name}
                                        </p>
                                        <p className="font-sans text-xs text-neutral-400 font-medium tracking-normal truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            closeMenu();
                                            navigate("/");
                                        }}
                                        className="shrink-0 text-xs font-sans uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                                    >
                                        CERRAR SESIÓN
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-sans text-xs text-neutral-400 font-medium tracking-normal">Q-PROOF SYSTEMS</p>
                                    <Link
                                        to="/auth?mode=login"
                                        onClick={closeMenu}
                                        className="font-sans text-xs uppercase tracking-wider text-white hover:text-cyan-300 transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold"
                                    >
                                        ACCEDER
                                    </Link>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </section>
        </div>
    );
}

export default KineticNav;
