import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

// Minimalistic UI Icons
const ShoppingCart = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
);
const ArrowDown = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
);
const Leaf = ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.2a7 7 0 0 1-9 9.8Z" /><path d="M11 20s-1-6.5 8-11" /></svg>
);

// Ecosystem Icons
const CommunityIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const VoiceIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
);
const ExpertIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
);
const MarketIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const DeliveryIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
);
const ComplaintIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);

// Asset Imports
import logo from '../assets/img/logo__1_-removebg-preview.png';
import mainLogo from '../assets/img/logo-removebg.png';
import logse from '../assets/img/logse.png';
import bgHero from '../assets/img/green-grassland-agriculture-sf65c4ucahnauiw1.jpg';
import banImg from '../assets/img/ban.png';
import carImg from '../assets/img/car.png';
import coffImg from '../assets/img/coff.png';
import eggImg from '../assets/img/egg.png';
import grpImg from '../assets/img/grp.png';

// Slider Product Images
import s2 from '../assets/slider-img/4.jpg';
import s3 from '../assets/slider-img/3.jpg';
import s4 from '../assets/slider-img/2.jpg';

const products = [
    { id: 1, name: "Premium Basmati Rice", price: "₹65/kg", img: eggImg, tag: "Essentials" },
    { id: 2, name: "Organic Black Pepper", price: "₹450/kg", img: coffImg, tag: "Handpicked" },
    { id: 3, name: "Fresh Farm Carrots", price: "₹40/kg", img: carImg, tag: "Daily" },
    { id: 4, name: "Natural Banana", price: "₹50/dozen", img: banImg, tag: "Harvest" },
    { id: 5, name: "Purple Grapes", price: "₹120/kg", img: grpImg, tag: "Sweet" },
    { id: 6, name: "Deep Hill Coffee", price: "₹300/pkg", img: coffImg, tag: "Premium" },
];

const LandingPage = () => {
    const { t } = useTranslation();
    const { scrollYProgress } = useScroll();

    // Parallax logic for the "Main Focus" image
    const imageScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);
    const imageBlur = useTransform(scrollYProgress, [0, 0.2, 0.5], [0, 5, 10]);
    const imageBrightness = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);
    const combinedFilter = useTransform(
        [imageBlur, imageBrightness],
        ([blur, brightness]) => `blur(${blur}px) brightness(${brightness})`
    );

    return (
        <div className="min-h-screen bg-deep-forest font-sans selection:bg-accent-green selection:text-white overflow-x-hidden">

            {/* 1. THE MAIN FOCUS: THE CINEMATIC BACKGROUND */}
            <div className="fixed inset-0 z-0">
                <motion.img
                    style={{
                        scale: imageScale,
                        filter: combinedFilter
                    }}
                    src={bgHero}
                    alt="Grassland Cinematic"
                    className="h-full w-full object-cover brightness-110 contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-deep-forest/90"></div>
            </div>

            {/* 2. THE COMPACT CAPSULE NAVIGATION */}
            <nav className="fixed top-0 left-0 right-0 z-[100] px-8 py-6">
                <div className="flex w-full items-center justify-between pointer-events-none px-4">

                    {/* Brand Capsule - Synced Height */}
                    <Link to="/" className="pointer-events-auto flex h-[52px] items-center gap-4 bg-white/90 backdrop-blur-xl px-7 rounded-full shadow-xl border border-white/20 group">
                        <img src={logo} alt="Logo" className="h-8 w-auto group-hover:rotate-12 transition-transform" />
                        <div className="flex items-center text-xl font-black uppercase tracking-[-0.05em]">
                            <span className="text-[#166534]">Pasumai</span>
                            <span className="text-[#f59e0b]">Cholai</span>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-4 pointer-events-auto shrink-0">
                        {/* Language Selector Injection */}
                        <div className="bg-white/90 backdrop-blur-xl rounded-full px-2 py-1 shadow-xl border border-white/20">
                            <LanguageSwitcher />
                        </div>

                        {/* Links Capsule - Increased Visibility */}
                        <div className="flex h-[52px] items-center gap-8 bg-white/95 backdrop-blur-xl px-10 rounded-full shadow-xl border border-white/20 text-[11px] font-black uppercase tracking-[0.1em] text-[#166534]">
                            <a href="/" className="hover:text-[#f59e0b] transition-all hover:scale-110 active:scale-95">{t('nav.home') || 'Home'}</a>
                            <a href="#about-us" className="hover:text-[#f59e0b] transition-all hover:scale-110 active:scale-95">{t('nav.aboutUs') || 'About Us'}</a>
                            <a href="#our-story" className="hover:text-[#f59e0b] transition-all hover:scale-110 active:scale-95 shrink-0">{t('nav.ourStory') || 'Our Story'}</a>
                            <a href="#ecosystem" className="hover:text-[#f59e0b] transition-all hover:scale-110 active:scale-95 shrink-0">{t('nav.whatWeDeliver') || 'What We Deliver'}</a>
                            <a href="#contact" className="hover:text-[#f59e0b] transition-all hover:scale-110 active:scale-95">{t('nav.contact') || 'Contact'}</a>
                        </div>

                        {/* Login Portal - Solar Aura Interaction */}
                        <Link to="/login" className="group relative flex h-[52px] items-center justify-center overflow-hidden rounded-full bg-[#166534] px-14 text-[11px] font-black uppercase tracking-wider text-white shadow-2xl transition-all duration-700 hover:scale-105 active:scale-95 border border-white/10 hover:border-[#f59e0b]/60">
                            <span className="relative z-10 transition-colors duration-500 group-hover:text-[#f59e0b]">{t('nav.login')}</span>
                            <div className="absolute inset-0 z-0 scale-0 rounded-full bg-gradient-radial from-[#f59e0b]/20 to-transparent transition-transform duration-700 ease-out group-hover:scale-[2.5]"></div>
                            <div className="absolute inset-0 z-[-1] transition-opacity duration-700 group-hover:opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#166534] via-transparent to-transparent opacity-100"></div>
                            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#f59e0b]/50 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"></div>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* 3. THE IMMERSIVE HERO - MINIMAL CONTENT TO SHOW THE IMAGE */}
            <section className="relative h-screen flex flex-col items-center justify-center z-10 px-12 md:px-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="relative flex flex-col items-center text-center"
                >
                    <div className="flex flex-col items-center gap-2 mb-4 drop-shadow-[0_30px_100px_rgba(0,0,0,1)]">
                        <h1 className="text-[10vw] md:text-[11vw] font-serif font-black leading-none select-none tracking-tighter italic whitespace-nowrap">
                            <span className="text-white">Pasumai</span> <span className="text-[#f59e0b]">Cholai</span>
                        </h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 1.2 }}
                        className="flex flex-col items-center"
                    >
                        <div className="mb-10"></div>

                        <p className="text-2xl md:text-5xl lg:text-5xl text-white font-space font-medium tracking-tight 
                            drop-shadow-[0_4px_4px_rgba(0,0,0,1)] 
                            drop-shadow-[0_8px_16px_rgba(0,0,0,1)] 
                            drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)] 
                            max-w-[80vw] leading-none mb-10 text-center"
                        >
                            {t('landing.heroQuotePart1') || '"Agriculture is a way of life,'} <span className="text-[#f59e0b] font-extrabold underline decoration-white/20 underline-offset-8">{t('landing.heroQuotePart2') || 'not a profession."'}</span>
                        </p>

                        <div className="flex items-center gap-4">
                            <span className="h-[2px] w-12 bg-[#f59e0b]"></span>
                            <span className="text-lg md:text-2xl font-black uppercase tracking-[0.6em] text-white">
                                G. Nammazhvar
                            </span>
                            <span className="h-[2px] w-12 bg-[#f59e0b]"></span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Animated Scroll Indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/40">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">Scroll to Discover</span>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="p-4 rounded-full border border-white/20"
                    >
                        <ArrowDown size={18} />
                    </motion.div>
                </div>
            </section>

            {/* 4. THE CONTENT SLIDE - OVERLAPPING THE MAIN IMAGE */}
            <div className="relative z-10">

                <section id="about-us" className="relative h-screen flex items-center justify-center overflow-hidden z-10 border-t border-white/5 bg-black/20 backdrop-blur-3xl">
                    {/* Deep Atmospheric Background */}
                    <div className="absolute inset-0 bg-[#011a13]">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.1),transparent)]"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(245,158,11,0.05),transparent)]"></div>
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                    </div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">

                            {/* Cinematic Branding Column - Left */}
                            <div className="relative flex justify-center lg:justify-end lg:pr-20">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="relative lg:-translate-x-10 flex flex-col items-center"
                                >
                                    {/* Multi-layered Aura */}
                                    <div className="absolute inset-0 bg-accent-green/20 blur-[120px] rounded-full"></div>
                                    <div className="absolute -inset-10 bg-[#f59e0b]/10 blur-[100px] rounded-full animate-pulse"></div>

                                    <img
                                        src={logse}
                                        alt="Pasumai Cholai Core"
                                        className="h-[35vh] lg:h-[55vh] w-auto relative z-10 drop-shadow-[0_0_100px_rgba(255,255,255,0.1)] filter brightness-110"
                                    />

                                    <div className="relative z-20 -mt-10 lg:-mt-16 text-center">
                                        <h3 className="text-4xl md:text-5xl font-black uppercase tracking-[-0.05em] flex items-center justify-center gap-0.5">
                                            <span className="text-accent-green drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">Pasumai</span>
                                            <span className="text-[#f59e0b] drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">Cholai</span>
                                        </h3>
                                        <div className="h-1 w-24 bg-gradient-to-r from-accent-green via-[#f59e0b] to-transparent mx-auto mt-0 rounded-full opacity-50"></div>
                                    </div>

                                    <motion.div
                                        animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                        className="absolute -top-4 -right-8 text-[#f59e0b]/30"
                                    >
                                        <Leaf size={70} />
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Narrative Column - Right */}
                            <div className="flex flex-col">
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                >
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-px w-12 bg-[#f59e0b]"></div>
                                        <span className="text-[11px] font-black uppercase tracking-[0.8em] text-[#f59e0b]">{t('landing.philosophyTitle') || 'Our Philosophy'}</span>
                                    </div>

                                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-[0.85]">
                                        {t('landing.philosophyHeadlinePart1') || 'Grow to'} <br /><span className="text-accent-green">{t('landing.philosophyHeadlinePart2') || 'Prosper.'}</span>
                                    </h2>

                                    <div className="space-y-8 text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed font-medium">
                                        <p>
                                            <Trans i18nKey="landing.philosophyBody1">
                                                <span className="text-[#f59e0b] font-bold">Pasumai Cholai is a one-step, farmer-friendly platform powered by</span> Uzhavar Thunai.
                                            </Trans>
                                        </p>
                                        <p>
                                            <Trans i18nKey="landing.philosophyBody2">
                                                <span className="text-accent-green font-bold">Empowering farmers</span> <span className="text-[#f59e0b] font-bold">to thrive, grow, and earn</span> fair profits <span className="text-accent-green font-bold">with multilingual support. It ensures</span> farmers can access help in their own language.
                                            </Trans>
                                        </p>

                                        <p>
                                            <Trans i18nKey="landing.philosophyBody3">
                                                We believe a nation truly develops when its <span className="text-accent-green font-bold">farmers, those who feed the world, do not suffer in poverty</span>. Every small step we take is towards strengthening the lives of those who feed the world.
                                            </Trans>
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="our-story" className="relative min-h-screen py-24 flex flex-col items-center justify-center overflow-hidden z-20 bg-[#011a13]">
                    {/* Clean Background */}
                    <div className="absolute inset-0 z-0 bg-[#011a13]"></div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                            {/* Narrative Column - Left */}
                            <div className="flex flex-col order-2 lg:order-1">
                                <motion.div
                                    initial={{ opacity: 0, x: -50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                >
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-px w-12 bg-[#f59e0b]"></div>
                                        <span className="text-[11px] font-black uppercase tracking-[0.8em] text-[#f59e0b]">{t('landing.storyTitle') || 'The Genesis'}</span>
                                    </div>

                                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-8 italic uppercase leading-[0.85]">
                                        {t('landing.storyHeadlinePart1') || 'Our'} <br /><span className="text-accent-green">{t('landing.storyHeadlinePart2') || 'Story.'}</span>
                                    </h2>

                                    <div className="space-y-6 text-lg md:text-xl lg:text-xl text-white/70 leading-relaxed font-medium">
                                        <p>
                                            <Trans i18nKey="landing.storyBody1">
                                                Pasumai Cholai was started to help those who <span className="text-accent-green font-bold">struggle to survive</span> and <span className="text-[#f59e0b] font-bold">earn fair profits</span>. We ask everyone: “When will our country become a <span className="text-accent-green font-bold">nation that supports its farmers</span>?” This happens when <span className="text-[#f59e0b] font-bold">farmers stop dying in poverty</span>. “It’s not just the <span className="text-accent-green font-bold">farmer’s poverty</span>, it’s the <span className="text-[#f59e0b] font-bold">nation’s poverty</span>.”
                                            </Trans>
                                        </p>

                                        <p>
                                            <Trans i18nKey="landing.storyBody2">
                                                According to NCRB reports, <span className="text-accent-green font-bold">753,425 people</span> have died in India and <span className="text-[#f59e0b] font-bold">15,500 in Tamil Nadu</span> between 2000–2026. We came here to stop this <span className="text-accent-green font-bold">tragedy</span>.
                                            </Trans>
                                        </p>

                                        <p>
                                            <Trans i18nKey="landing.storyBody3">
                                                We are young and passionate, committed to <span className="text-[#f59e0b] font-bold">strengthening the lives of farmers</span> and ensuring <span className="text-accent-green font-bold">fair opportunities</span>.
                                            </Trans>
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Slider Column - Right */}
                            <div className="relative flex flex-col items-center order-1 lg:order-2">
                                {/* Short Floating Label Above Slider */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 0.8 }}
                                    className="mb-4"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#f59e0b] italic whitespace-nowrap">
                                        {t('landing.storyLabel') || 'When Fair Gets Justice.'}
                                    </span>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1 }}
                                    className="relative w-full aspect-[2/3] lg:h-[45vh] lg:w-auto"
                                >
                                    <div className="relative z-10 h-full w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl bg-black">
                                        <motion.div
                                            animate={{ x: ["0%", "0%", "-100%", "-100%", "-200%", "-200%", "0%"] }}
                                            transition={{
                                                duration: 60,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                times: [0, 0.3, 0.35, 0.65, 0.7, 0.95, 1]
                                            }}
                                            className="flex h-full w-[300%]"
                                        >
                                            {[s2, s3, s4].map((img, i) => (
                                                <div key={i} className="min-w-full h-full relative flex items-center justify-center">
                                                    <img src={img} className="h-full w-full object-cover" alt={`Story slide ${i + 1}`} />
                                                    <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    </div>

                                    {/* Floating Orange Leaf */}
                                    <motion.div
                                        animate={{ y: [0, -10, 0], rotate: [0, -10, 0] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                        className="absolute -top-4 -left-4 text-[#f59e0b]/30"
                                    >
                                        <Leaf size={60} />
                                    </motion.div>
                                </motion.div>

                                {/* Enlarged & Centered Orange Pagination Dots */}
                                <div className="mt-8 flex gap-5 relative group">
                                    {[0, 1, 2].map((dot) => (
                                        <div key={dot} className="h-2.5 w-2.5 rounded-full bg-white/20 transition-all duration-500"></div>
                                    ))}
                                    {/* Moving Orange Indicator Dot - Synchronized with Slider */}
                                    <motion.div
                                        animate={{ x: [0, 0, 30, 30, 60, 60, 0] }}
                                        transition={{
                                            duration: 60,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            times: [0, 0.3, 0.35, 0.65, 0.7, 0.95, 1]
                                        }}
                                        className="absolute h-2.5 w-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                    ></motion.div>
                                </div>

                                {/* Tamil Quote Below Slider & Dots - Moved Up */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="mt-10 text-center max-w-2xl px-4"
                                >
                                    <p className="text-xl md:text-2xl font-black italic leading-[1.3] tracking-tighter">
                                        <span className="text-[#f59e0b]">"உலகத்தில் உயர்ந்தவன் ஒருவன் தான்.</span> <span className="text-accent-green">உழுது, விதைத்து, அறுத்து,</span> <span className="text-[#f59e0b]">உலகத்துக்கே சோறு போடுபவன் தான்</span> <span className="text-accent-green">உலகத்திலேயே உயர்ந்தவன்."</span>
                                    </p>
                                </motion.div>
                            </div>

                        </div>
                    </div>
                </section>

                <section id="ecosystem" className="relative py-32 overflow-hidden z-20 bg-[#011a13]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.05),transparent)] pointer-events-none"></div>
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="text-center mb-24">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <span className="text-[11px] font-black uppercase tracking-[0.8em] text-[#f59e0b] mb-4 block">Our Digital Ecosystem</span>
                                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic uppercase">
                                    Farmer <span className="text-accent-green">Empowerment</span> <br /> Through Technology.
                                </h2>
                            </motion.div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "Uzhavar Vattam",
                                    label: "Community Hub",
                                    icon: <CommunityIcon />,
                                    desc: "Connect with fellow farmers, share knowledge, and learn sustainable methods together.",
                                    id: "01"
                                },
                                {
                                    title: "Uzhavar Oli",
                                    label: "Pasum AI – Voice Support",
                                    icon: <VoiceIcon />,
                                    desc: "Experience native voice-powered interaction by Pasum AI. Ask any farming query and get instant AI guidance.",
                                    id: "02"
                                },
                                {
                                    title: "Uzhavar Aalosanai",
                                    label: "Expert Connect",
                                    icon: <ExpertIcon />,
                                    desc: "Talk directly to agricultural scientists and experienced experts for crop-specific advice.",
                                    id: "03"
                                },
                                {
                                    title: "Iyarkai Angadi",
                                    label: "Organic Market",
                                    icon: <MarketIcon />,
                                    desc: "Sell your organic produce directly to customers at fair prices without intermediaries.",
                                    id: "04"
                                },
                                {
                                    title: "Uzhavar Payanam",
                                    label: "Delivery Network",
                                    icon: <DeliveryIcon />,
                                    desc: "Reliable logistics system ensuring your produce reaches from farm to consumer fresh and fast.",
                                    id: "05"
                                },
                                {
                                    title: "Uzhavar Kural",
                                    label: "Complaint System",
                                    icon: <ComplaintIcon />,
                                    desc: "Voice your grievances. Submit issues and track their resolution through our transparent system.",
                                    id: "06"
                                }
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    whileHover={{ y: -10 }}
                                    className="group relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                                >
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="p-5 rounded-2xl bg-black/40 group-hover:scale-110 transition-transform duration-500">
                                            {item.icon}
                                        </div>
                                        <span className="text-4xl font-serif italic text-white/10 font-black group-hover:text-accent-green/20 transition-colors">{item.id}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{item.title}</h3>
                                    <p className="text-[#f59e0b] text-[10px] font-black uppercase tracking-widest mb-6">{item.label}</p>
                                    <p className="text-white/50 text-sm leading-relaxed font-medium group-hover:text-white/80 transition-colors">
                                        {item.desc}
                                    </p>
                                    <div className="mt-8 h-1 w-0 bg-gradient-to-r from-accent-green to-[#f59e0b] group-hover:w-full transition-all duration-700 rounded-full"></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Products Grid Section */}
                <section id="products" className="py-40 bg-white relative z-10">
                    <div className="container mx-auto px-6">
                        <div className="mb-32 flex flex-col md:flex-row items-end justify-between gap-8">
                            <div>
                                <span className="text-xs font-black text-accent-green uppercase tracking-[0.5em] mb-4 block">{t('landing.harvestBadge') || "The Season's Best"}</span>
                                <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-primary-green leading-none italic uppercase">{t('landing.harvestTitlePart1') || 'Organic'} <br /> {t('landing.harvestTitlePart2') || 'Harvest.'}</h2>
                            </div>
                            <p className="max-w-xs text-primary-green/40 font-bold uppercase tracking-widest text-[10px] leading-loose">
                                {t('landing.harvestDescription') || 'Sourced from local fields and delivered with the freshness of morning dew. No intermediaries. No compromise.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {products.map((p) => (
                                <motion.div
                                    key={p.id}
                                    whileHover={{ y: -20 }}
                                    className="group relative bg-[#f8fafc] rounded-[4rem] p-8 border border-stone-100 transition-all duration-500 hover:shadow-4xl"
                                >
                                    <div className="h-72 rounded-[3.5rem] bg-white border border-stone-50 mb-8 overflow-hidden flex items-center justify-center p-12 transition-transform group-hover:scale-[1.02]">
                                        <img src={p.img} alt={p.name} className="h-full w-auto object-contain drop-shadow-3xl transition-transform group-hover:scale-110" />
                                        <div className="absolute top-6 left-6 bg-accent-green/10 text-accent-green px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">{p.tag}</div>
                                    </div>
                                    <div className="px-4 pb-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-black text-primary-green tracking-tight">{p.name}</h3>
                                            <p className="text-lg font-bold text-accent-green mt-1">{p.price}</p>
                                        </div>
                                        <button className="h-16 w-16 rounded-full bg-primary-green text-white flex items-center justify-center hover:bg-accent-green hover:shadow-2xl transition-all shadow-xl active:scale-95 group-hover:rotate-12">
                                            <ShoppingCart size={24} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Cinematic Footer Section */}
                <footer id="contact" className="py-40 bg-primary-green relative overflow-hidden text-center text-white">
                    <img src={mainLogo} alt="Logo" className="h-[20vw] mx-auto opacity-5 invert brightness-0 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" />

                    <div className="relative z-10 container mx-auto px-6">
                        <h4 className="text-5xl md:text-8xl font-black italic tracking-tighter mb-16 uppercase leading-none max-w-5xl mx-auto">
                            {t('landing.footerTitlePart1') || 'Saving the'} <span className="text-accent-green">{t('landing.footerTitlePart2') || 'Expert'}</span> <br /> {t('landing.footerTitlePart3') || 'who feeds the world.'}
                        </h4>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-12 text-[11px] font-black uppercase tracking-[0.4em] mb-32 opacity-60">
                            <Link to="/register" className="hover:text-accent-green">{t('nav.partnerWithUs') || 'Partner With Us'}</Link>
                            <span className="hidden sm:block h-[1px] w-20 bg-white/20"></span>
                            <a href="#about-us" className="hover:text-accent-green">{t('nav.ourMission') || 'Our Mission'}</a>
                            <span className="hidden sm:block h-[1px] w-20 bg-white/20"></span>
                            <a href="#contact" className="hover:text-accent-green">{t('nav.contact') || 'Contact'}</a>
                        </div>

                        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
                            <p>© 2026 Pasumai Cholai. All Rights Reserved.</p>
                            <div className="flex gap-12 items-center">
                                <span className="h-2 w-2 rounded-full bg-accent-green"></span>
                                <p>Designed for Green Thumb 0990</p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
export { LandingPage };
