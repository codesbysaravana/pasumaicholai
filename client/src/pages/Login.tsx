import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { getDashboardPathByRole, useAuth } from "../context/AuthContext";

// Minimalistic UI Icons
const Mail = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="14" x="2" y="5" rx="2" /></svg>
);
const Lock = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const ArrowLeft = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
const Eye = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOff = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.88 9.88l-3.29-3.29m7.59 7.59l3.29 3.29M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M12 9a3 3 0 0 1 3 3m-3 3a3.08 3.08 0 0 1-1.39-.34" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
);

import bgHero from '../assets/img/green-grassland-agriculture-sf65c4ucahnauiw1.jpg';
import logo from '../assets/img/logi.png';

const Leaf = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.2a7 7 0 0 1-9 9.8Z" /><path d="M11 20s-1-6.5 8-11" /></svg>
);

export function LoginPage() {
  const navigate = useNavigate();
  const { auth, isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { scrollYProgress } = useScroll();
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.4]);
  const imageBlur = useTransform(scrollYProgress, [0, 1], [0, 12]);

  if (isAuthenticated && auth) {
    return <Navigate to={getDashboardPathByRole(auth.role)} replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const identifiedRole = await login({ email, password });
      navigate(getDashboardPathByRole(identifiedRole), { replace: true });
    } catch (error: any) {
      setError(error.message || "Failed to authenticate");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 bg-deep-forest font-sans selection:bg-accent-green selection:text-white">
      {/* Cinematic Vibrant Background - Matched with Home Screenshot */}
      <div className="fixed inset-0 z-0">
        <motion.img
          style={{
            scale: imageScale,
            filter: useTransform(imageBlur, (v) => `blur(${v}px) brightness(1.1) contrast(1.05)`)
          }}
          src={bgHero}
          alt="Cinematic Background"
          className="h-full w-full object-cover opacity-100 transition-transform duration-[40s] ease-linear"
        />

        {/* Cinematic Overlays (Vibrant & Deep) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-deep-forest/90"></div>

        {/* Floating Agri Particles (Matching Home Accent Colors) */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: 0.2 + Math.random(),
              opacity: 0
            }}
            animate={{
              x: [(Math.random() * 100) + "%", (Math.random() * 100) + "%", (Math.random() * 100) + "%"],
              y: [(Math.random() * 100) + "%", (Math.random() * 100) + "%", (Math.random() * 100) + "%"],
              opacity: [0, 0.4, 0],
              rotate: [0, 360],
            }}
            transition={{ duration: 25 + Math.random() * 30, repeat: Infinity, ease: "linear" }}
            className="absolute p-4 text-[#f59e0b] drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
          >
            <Leaf size={14 + Math.random() * 20} />
          </motion.div>
        ))}
      </div>

      {/* Back to Home Action */}
      <Link
        to="/"
        className="fixed top-12 left-12 z-[100] flex items-center gap-3 bg-white/5 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 hover:border-accent-green/50 transition-all group"
      >
        <ArrowLeft />
        <span>Return to Home</span>
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: [0, -10, 0],
          scale: 1,
          boxShadow: isHovered
            ? "0 40px 100px rgba(0,0,0,0.6)"
            : "0 20px 60px rgba(0,0,0,0.4)"
        }}
        transition={{
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          default: { duration: 1, ease: "easeOut" }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[3rem] bg-black/40 px-10 py-6 text-white shadow-2xl backdrop-blur-3xl border border-white/10"
      >
        {/* Animated Card Shine Effect */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 6 }}
          className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
        />
        <div className="mb-4 text-center pt-0">
          <Link to="/" className="block mx-auto mb-4 hover:scale-105 transition-transform active:scale-95">
            <img src={logo} alt="Logo" className="h-28 w-auto max-w-[360px] mx-auto filter brightness-110 drop-shadow-[0_0_40px_rgba(255,255,255,0.3)]" />
          </Link>

          <h1 className="text-4xl font-serif italic leading-none mb-2 tracking-tighter">
            Welcome <span className="text-[#f59e0b] not-italic">Back.</span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[14px] font-black uppercase tracking-[0.6em] text-accent-green">
              Pasumai <span className="text-[#f59e0b]">Cholai</span>
            </p>
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"></div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 block text-left ml-[calc(50%-170px)] pl-2">Identity Email</label>
            <div className="relative group w-full max-w-[340px] mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] group-hover:text-white transition-all duration-300">
                <Mail />
              </div>
              <input
                type="email"
                required
                className="w-full block rounded-[1.2rem] bg-white/[0.04] border border-white/10 p-3.5 pl-12 outline-none focus:border-accent-green/50 focus:bg-white/[0.08] transition-all font-bold text-sm tracking-wide placeholder:text-white/10 shadow-inner"
                placeholder="partner@pasumaicholai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 block text-left ml-[calc(50%-170px)] pl-2">Encrypted Key</label>
            <div className="relative group w-full max-w-[340px] mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] group-hover:text-white transition-all duration-300">
                <Lock />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full block rounded-[1.2rem] bg-white/[0.04] border border-white/10 p-3.5 pl-12 pr-12 outline-none focus:border-accent-green/50 focus:bg-white/[0.08] transition-all font-bold text-sm tracking-wide placeholder:text-white/10 shadow-inner"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 text-[10px] font-black uppercase tracking-widest text-red-200 text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="group relative w-full max-w-[220px] mx-auto block overflow-hidden rounded-full bg-[#f59e0b] px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all duration-500 hover:scale-[1.05] active:scale-95 shadow-[0_20px_40px_rgba(245,158,11,0.3)]"
            >
              <span className="relative z-10">Login</span>

              {/* Premium Shimmer Effect */}
              <motion.div
                className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 -skew-x-12"
                initial={{ left: '-100%' }}
                animate={{ left: '200%' }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
              />
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">
            New to the mission?
          </p>
          <Link
            to="/register"
            className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-transparent border border-white/20 text-[9px] font-black uppercase tracking-[0.3em] text-white hover:border-accent-green/50 hover:bg-white/[0.03] transition-all duration-500 group overflow-hidden"
          >
            <span className="relative z-10 group-hover:text-accent-green transition-colors">Register</span>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-accent-green shadow-[0_0_10px_rgba(34,197,94,0.8)]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-accent-green/0 via-accent-green/[0.05] to-accent-green/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </Link>
        </div>

        {/* Subtle Decorative Element */}
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-accent-green/5 blur-3xl"></div>
      </motion.section>

      {/* Quote Footer - Matches Landing Page Aesthetic */}
      <div className="fixed bottom-10 z-10 flex flex-col items-center gap-4 opacity-20 hover:opacity-100 transition-opacity duration-700 pointer-events-none sm:pointer-events-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white">Cultivating experts.</p>
      </div>
    </main>
  );
}
