import { useState, type FormEvent, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboardPathByRole, useAuth, type UserRole } from "../context/AuthContext";
import { aadhaarApi } from "../api/aadhaarApi";
import { auth as firebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../lib/firebase";

// Extend Window interface for Firebase
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: any;
  }
}

interface IconProps {
  size?: number;
  className?: string;
}

const Lock = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const Mail = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="14" x="2" y="5" rx="2" /></svg>
);
const Shield = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const CheckCircle = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const UserCheck = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
);
const ArrowLeft = ({ size = 18, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
const Eye = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOff = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.88 9.88l-3.29-3.29m7.59 7.59l3.29 3.29M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M12 9a3 3 0 0 1 3 3m-3 3a3.08 3.08 0 0 1-1.39-.34" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
);

import { useScroll, useTransform } from "framer-motion";
import bgHero from '../assets/img/green-grassland-agriculture-sf65c4ucahnauiw1.jpg';
import logiImg from '../assets/img/logi.png';

const Leaf = ({ size = 20, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.2a7 7 0 0 1-9 9.8Z" /><path d="M11 20s-1-6.5 8-11" /></svg>
);

export function RegisterPage() {
  const navigate = useNavigate();
  const { auth, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CONSUMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { scrollYProgress } = useScroll();
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.4]);
  const imageBlur = useTransform(scrollYProgress, [0, 1], [0, 12]);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  }, []);


  const triggerNotification = (message: string) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 3000);
  };

  if (isAuthenticated && auth) {
    return <Navigate to={getDashboardPathByRole(auth.role)} replace />;
  }

  const handleCheckAadhaar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aadhaarApi.check(aadhaar);
      const fullPhone = res.data.data.fullMobile;
      setMobile(fullPhone);

      await sendFirebaseOTP(fullPhone);
      triggerNotification("Aadhaar Authenticated");
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || "Aadhaar validation failed");
    } finally {
      setLoading(false);
    }
  };

  const sendFirebaseOTP = async (phoneNumber: string) => {
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
    } catch (err: any) {
      console.warn("Firebase SMS failed. Using Developer Mock Recovery.");
      setError("SMS Service unavailable. Using Developer Mock Recovery (Use 123456)");
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await aadhaarApi.verifyOtp({ mobile, otp, aadhaar });
      setAadhaarData(res.data.data);
      triggerNotification("Identity Shield Verified");
      setStep(3);
    } catch (err: any) {
      setError("Invalid OTP or verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...aadhaarData,
        email,
        password,
        aadhaar,
        role: role.toLowerCase(),
      };
      await aadhaarApi.register(payload);
      triggerNotification("Registration Complete!");
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const formatAadhaar = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 12);
    return raw.replace(/(\d{4})(?=\d)/g, '$1-');
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaar(raw);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 bg-deep-forest font-sans selection:bg-accent-green selection:text-white">
      {/* Cinematic Vibrant Background - Matched with Login */}
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

      {/* Navigation Layer */}
      {/* Return Home Button Moved for Alignment */}

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-12 z-[200] flex items-center gap-4 bg-white/10 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl"
          >
            <div className="h-6 w-6 rounded-full bg-[#f59e0b] flex items-center justify-center text-white">
              <CheckCircle size={14} />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{showNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Link to="/" className="fixed top-12 left-12 z-[100] flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 hover:border-[#f59e0b]/30 transition-all duration-300 group shadow-2xl">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        <span>Return Home</span>
      </Link>

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-4 py-0">
        {/* PROGRESS INDICATOR */}
        <div className="px-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-6 right-6 top-[18px] h-0.5 bg-white/5"></div>
            <div className="absolute left-6 right-6 top-[18px] h-0.5 pointer-events-none">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                className="h-full bg-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              />
            </div>

            {[1, 2, 3].map((s) => {
              return (
                <div
                  key={s}
                  className={`relative z-10 flex flex-col items-center gap-2 cursor-default`}
                >
                  <motion.div
                    animate={{
                      backgroundColor: step > s ? "#f59e0b" : step === s ? "#f59e0b" : "rgba(255,255,255,0.05)",
                      borderColor: step >= s ? "#f59e0b" : "rgba(255,255,255,0.1)",
                      scale: step === s ? 1.1 : 1
                    }}
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-500 ${step >= s ? 'text-white' : 'text-white/20'}`}
                  >
                    {step > s ? <CheckCircle size={14} /> : s}
                  </motion.div>
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${step === s ? 'text-[#f59e0b]' : 'text-white/10'}`}>
                    {s === 1 ? "Start" : s === 2 ? "Verify" : "Final"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOCUSED CONTAINER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-[40px] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden pt-0 pb-6 px-8 md:pt-0 md:pb-8 md:px-12 w-full max-w-xl mx-auto"
        >
          <div className="absolute top-0 right-0 h-40 w-40 bg-[#f59e0b]/5 blur-[60px] pointer-events-none"></div>

          <div className="flex flex-col items-center gap-2">
            {/* BRANDING INSIDE CARD */}
            <div className="flex flex-col items-center text-center">
              <img src={logiImg} className="h-48 w-48 object-contain -mb-8" alt="Logo" />
              <h1 className="text-3xl font-black text-white uppercase tracking-[0.1em] leading-none">Pasumai Cholai</h1>
              <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-[#f59e0b] mt-1">Verified Network</p>
            </div>

            <div className="w-full min-h-[300px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-md mx-auto">
                    <div className="w-full text-center space-y-2 flex flex-col items-center">
                      <div className="relative w-full max-w-[400px]">
                        <input
                          autoFocus
                          placeholder="XXXX-XXXX-XXXX"
                          className="w-full bg-transparent text-center outline-none border-none font-black text-white uppercase tracking-[0.3em] text-3xl placeholder:text-white/80 transition-all"
                          value={formatAadhaar(aadhaar)}
                          onChange={handleAadhaarChange}
                        />
                      </div>
                      <div className="h-[2px] w-full max-w-md bg-[#f59e0b]/50"></div>
                    </div>

                    <div id="recaptcha-container" className="my-1"></div>

                    <button onClick={handleCheckAadhaar} disabled={loading} className="group relative w-full h-11 max-w-[190px] overflow-hidden rounded-full bg-[#f59e0b] font-black uppercase tracking-[0.3em] text-xs text-white shadow-2xl transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-50 mt-10">
                      {loading ? "Checking..." : "Verify Identity"}
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center w-full max-w-md mx-auto">
                    <div className="text-center space-y-6 w-full max-w-xs">
                      <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">Code sent to mobile</p>
                      <input
                        autoFocus
                        className="w-full bg-transparent p-4 outline-none border-b border-white/10 focus:border-[#f59e0b] font-black text-white tracking-[0.6em] text-4xl text-center"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </div>
                    <div className="flex justify-center w-full mt-10">
                      <button onClick={handleVerifyOTP} disabled={loading} className="w-full h-11 max-w-[200px] rounded-full bg-[#f59e0b] text-white font-black uppercase tracking-[0.2em] text-[11px] active:scale-[0.98]">
                        {loading ? "Matching..." : "Complete Shield"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center w-full max-w-md mx-auto">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 w-full max-w-md mb-2">
                      <img src={aadhaarData.photo} className="h-10 w-10 object-cover rounded-lg border border-white/10" alt="User" />
                      <div>
                        <h4 className="text-base font-black text-white uppercase tracking-tight leading-none mb-1">{aadhaarData.name}</h4>
                        <span className="text-[7px] font-black tracking-[0.4em] uppercase text-[#f59e0b]">Verified Partner</span>
                      </div>
                    </div>

                    <form onSubmit={handleFinalRegister} className="mt-2 w-full max-w-md space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f59e0b] ml-1">Comm Node ID</label>
                          <input type="email" required className="w-full bg-white/10 border border-white/20 focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/50 rounded-xl p-3 outline-none text-sm font-bold text-white placeholder:text-white/30 transition-all" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f59e0b] ml-1">Access Tier</label>
                          <select required className="w-full bg-[#022c22] border border-white/20 focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/50 rounded-xl p-3 outline-none text-sm font-black uppercase tracking-[0.1em] text-white cursor-pointer transition-all" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                            <option value="FARMER">Farmer</option>
                            <option value="CONSUMER">Consumer</option>
                            <option value="EXPERT">Expert</option>
                            <option value="DELIVERY">Delivery</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f59e0b] ml-1">Shield Key</label>
                          <div className="relative">
                            <input type={showPassword ? "text" : "password"} required minLength={6} className="w-full bg-white/10 border border-white/20 focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/50 rounded-xl p-3 pr-10 outline-none text-sm font-bold text-white placeholder:text-white/30 transition-all" placeholder="Secret Key" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5 relative">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f59e0b] ml-1">Confirm Key</label>
                          <div className="relative">
                            <input type={showPassword ? "text" : "password"} required minLength={6} className="w-full bg-white/10 border border-white/20 focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/50 rounded-xl p-3 pr-10 outline-none text-sm font-bold text-white placeholder:text-white/30 transition-all" placeholder="Repeat Key" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center w-full mt-6">
                        <button type="submit" disabled={loading} className="w-full h-11 max-w-[200px] rounded-full bg-[#f59e0b] text-white font-black uppercase tracking-[0.2em] text-[11px] active:scale-[0.98]">
                          {loading ? "Allocating Node..." : "Registration"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-[#f59e0b]/10 border border-[#f59e0b]/20 p-4 rounded-2xl text-center backdrop-blur-md">
                  <p className="text-[10px] font-black text-[#f59e0b] uppercase tracking-[0.2em]">{error}</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* FOOTER */}
        <div className="flex flex-col items-center gap-4 opacity-20 mt-4 pb-8">
          <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white">Pasumai Hub · Decentralized Mesh Node 2.0</p>
          <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>
      </div>
    </main>
  );
}
