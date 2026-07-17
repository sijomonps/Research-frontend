"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Lock,
  X,
  User as UserIcon,
  Mail,
  Briefcase,
  GraduationCap,
  Sparkles,
  FileText,
  Bookmark,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiGet, apiPostJson, type ApiListResponse } from "@/lib/api";
import { useAuth, type User } from "@/components/AuthProvider";


export default function Home() {
  const router = useRouter();
  const { login } = useAuth();
  
  // App states
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Login input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState("");
  
  // Modal mode: "login" or "register"
  const [modalMode, setModalMode] = useState<"login" | "register">("login");
  const [availableDepartments, setAvailableDepartments] = useState<{ _id: string; name: string; department?: string }[]>([]);

  // Registration form states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState("");
  const [regDept, setRegDept] = useState("");
  const [regGuideId, setRegGuideId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);



  // Hero background carousel state
  const bgImages = ["/Hero images/1.jpg", "/Hero images/2.jpg"];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch users and load dynamic local registry data
  useEffect(() => {
    const fetchUsersAndDepts = async () => {
      try {
        setLoading(true);
        const [res, deptRes] = await Promise.all([
          apiGet<ApiListResponse<User>>("/research-guides"),
          apiGet<ApiListResponse<{ _id: string; name: string; department?: string; status?: string }>>("/research-centers")
        ]);
        setUsers(res.items || []);
        const activeCenters = (deptRes.items || []).filter(c => c.status === "Active" || !c.status);
        setAvailableDepartments(activeCenters);
      } catch (err) {
        console.error("Failed to fetch user directory or departments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndDepts();
  }, []);

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setModalMode("login");
    setRegSuccess(false);
    setEmail("");
    setPassword("");
    setLoginRole("");
    setRegName("");
    setRegEmail("");
    setRegRole("");
    setRegDept("");
    setRegGuideId("");
    setRegPassword("");
    setRegConfirmPassword("");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regRole || !regPassword || !regConfirmPassword) {
      alert("Please fill in all fields.");
      return;
    }
    if (regRole === "scholar" && !regGuideId) {
      alert("Please select a research guide.");
      return;
    }
    if (regRole !== "scholar" && !regDept) {
      alert("Please select a research center.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setSubmittingReg(true);

      let guideId: string | undefined = undefined;
      let researchCenterId: string | undefined = undefined;
      let department: string | undefined = regDept;

      if (regRole === "scholar") {
        guideId = regGuideId;
        const selectedGuide = users.find(u => u._id === regGuideId);
        if (selectedGuide) {
          researchCenterId = selectedGuide.researchCenter?._id || selectedGuide.researchCenter;
          department = selectedGuide.department;
        }
      } else {
        const selectedCenter = availableDepartments.find(c => c.name === regDept);
        if (selectedCenter) {
          researchCenterId = selectedCenter._id;
          department = selectedCenter.department;
        }
      }

      await apiPostJson("/users", {
        name: regName.trim(),
        email: regEmail.trim(),
        role: regRole,
        roles: [regRole],
        department: department,
        researchCenterId: researchCenterId,
        guideId: guideId,
        password: regPassword,
        status: "PendingApproval"
      });

      setRegSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmittingReg(false);
    }
  };

  // Handle Login action
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !loginRole) {
      alert("Please enter email, password, and select a role.");
      return;
    }

    try {
      const res = await apiPostJson<{ token: string; user: User }>("/auth/login", {
        email: email.trim(),
        password: password,
        role: loginRole,
      });

      if (res.token && res.user) {
        if (res.user.status === "PendingApproval") {
          const isScholar = res.user.role === "scholar" || res.user.roles?.includes("scholar");
          if (isScholar) {
            alert("Your account is pending approval from your selected Research Guide.");
          } else {
            alert("Your account is pending administrator approval.");
          }
          return;
        }
        login(res.token, res.user);
        setShowLoginModal(false);
      } else {
        alert("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      alert(err.message || "Invalid credentials");
    }
  };

  const totalScholars = 42; // Sourced dynamically or static fallback
  const totalGuides = users.filter((u) => u.permissions?.includes("research_guide")).length;
  const totalPublications = 18; // Static fallback
  const totalCenters = availableDepartments.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body selection:bg-[#9B0302]/20 selection:text-[#9B0302] overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto w-full z-10 sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MarianResearch" className="h-9 sm:h-12 w-auto object-contain" />
        </div>
        <button onClick={() => setShowLoginModal(true)} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 flex items-center gap-1.5 sm:gap-2 hover:scale-105 active:scale-95">
          <Lock className="w-3.5 h-3.5" /> Portal Login
        </button>
      </nav>

      <main className="flex-1 w-full flex flex-col">
        {/* Hero Section Wrapper (Full Viewport Width Background) */}
        <div className="relative w-full overflow-hidden">
          {/* Background Hero Image Carousel */}
          {bgImages.map((src, index) => (
            <div 
              key={src}
              className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out pointer-events-none ${
                index === bgIndex ? "opacity-[0.12]" : "opacity-0"
              }`}
              style={{ backgroundImage: `url('${src.replace(/ /g, "%20")}')` }}
            />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:w-[600px] bg-red-100/50 rounded-full blur-[120px] z-0 pointer-events-none"></div>
          
          {/* Hero Content Section (Centered and restricted max-w-7xl) */}
          <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-28 sm:pt-32 sm:pb-36 lg:pt-40 lg:pb-48 flex flex-col items-center justify-center text-center min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] z-10">
            <div className="relative flex flex-col items-center text-center w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50/90 backdrop-blur-sm border border-red-100 text-[#9B0302] text-[10px] font-bold uppercase tracking-widest mb-6 sm:mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Excellence in Research & Innovation</span>
              </div>
              
              <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight max-w-4xl mb-6">
                Pioneering <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9B0302] to-[#e63946]">Discoveries</span> for a Better Tomorrow
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed mb-8 sm:mb-10">
                Welcome to the MarianResearch portal. Explore the cutting-edge academic achievements, funded projects, and publications from our esteemed scholars and research guides.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4 sm:px-0 justify-center">
                <button onClick={() => { setShowLoginModal(true); setModalMode("register"); }} className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#9B0302] text-white font-semibold text-sm hover:bg-[#800201] transition-all shadow-lg shadow-[#9B0302]/30 hover:-translate-y-0.5">
                  Request Access
                </button>
                <button onClick={() => { setShowLoginModal(true); setModalMode("login"); }} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm hover:-translate-y-0.5">
                  Login
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Statistics Section */}
        <section className="w-full bg-white border-y border-slate-200/50 py-10 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 lg:divide-x lg:divide-slate-100">
              <div className="flex flex-col items-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-[#9B0302] flex items-center justify-center mb-4">
                  <Bookmark className="w-5 h-5" />
                </div>
                <span className="text-4xl font-display font-bold text-slate-900 mb-1">{totalCenters}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Research Centers</span>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-4xl font-display font-bold text-slate-900 mb-1">{totalPublications}+</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Publications</span>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-4xl font-display font-bold text-slate-900 mb-1">{totalScholars}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Scholars</span>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-4xl font-display font-bold text-slate-900 mb-1">{totalGuides}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Research Guides</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-center border-t border-slate-800 mt-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-white/50" />
          <span className="font-display font-bold text-lg tracking-tight text-white/80">MarianResearch</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} Marian College Kuttikkanam Autonomous. All rights reserved.</p>
        <p className="text-xs mt-2 text-slate-500">Excellence in Research & Innovation</p>
        <div className="mt-4 pt-4 border-t border-slate-800/60 max-w-xs mx-auto text-[11px] text-slate-500">
          Developed by{" "}
          <a
            href="https://sijomonps.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600"
          >
            Sijomon P S
          </a>
        </div>
      </footer>

      {/* Login / Register Card Popup Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(155,3,2,0.12)] border border-slate-100 animate-in zoom-in-95 duration-200 relative max-h-[95vh] overflow-y-auto">
            
            <button
              onClick={() => handleCloseModal()}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo container with gradient border and backdrop blur */}
            <div className="flex flex-col items-center justify-center mb-5 mt-2">
              <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-200/60 shadow-sm max-w-[220px] transition-transform duration-300 hover:scale-[1.02]">
                <img src="/logo.png" alt="MarianResearch" className="h-10 sm:h-12 w-auto object-contain" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">
                {modalMode === "login" ? "Portal Login" : "Request Access"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {modalMode === "login" ? "Sign in to access your research dashboard" : "Submit a request to the administrator"}
              </p>
            </div>
            
            {modalMode === "register" && regSuccess ? (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Your access request has been successfully sent to the administrator. You will be able to sign in once your account is approved.
                </p>
                <button
                  type="button"
                  onClick={() => handleCloseModal()}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : modalMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Enter email e.g. user@univ.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Role</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={loginRole}
                      onChange={(e) => setLoginRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all cursor-pointer appearance-none"
                    >
                      <option value="" disabled>-- Select role --</option>
                      <option value="admin">Administrator</option>
                      <option value="scholar">Scholar</option>
                      <option value="faculty">Faculty Member</option>
                      <option value="library">Librarian</option>
                    </select>
                  </div>
                </div>



                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleCloseModal()}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#9B0302] hover:bg-[#800201] text-xs font-semibold text-white transition-all shadow-md shadow-[#9B0302]/20 hover:shadow-lg hover:shadow-[#9B0302]/30 active:scale-95 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>

                <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100/60">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("register");
                      setRegSuccess(false);
                    }}
                    className="text-[#9B0302] hover:underline font-bold cursor-pointer"
                  >
                    Request Access
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@university.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Role</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      required
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all cursor-pointer appearance-none"
                    >
                      <option value="" disabled>-- Select role --</option>
                      <option value="scholar">Scholar</option>
                      <option value="faculty">Faculty Member</option>
                    </select>
                  </div>
                </div>

                {regRole === "scholar" && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Research Guide</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        required
                        value={regGuideId}
                        onChange={(e) => setRegGuideId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all cursor-pointer appearance-none"
                      >
                        <option value="" disabled>-- Select guide --</option>
                        {users
                          .filter((u) => u.permissions?.includes("research_guide"))
                          .map((guide) => (
                            <option key={guide._id} value={guide._id}>
                              {guide.name} ({guide.department || "No Department"})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {regRole && regRole !== "scholar" && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Research Center</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        required
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all cursor-pointer appearance-none"
                      >
                        <option value="" disabled>-- Select center --</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept._id} value={dept.name}>{dept.name}</option>
                        ))}
                        {availableDepartments.length === 0 && (
                          <>
                            <option value="MCA">MCA</option>
                            <option value="Computer Science">Computer Science</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showRegConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("login");
                      setRegSuccess(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all active:scale-95 cursor-pointer"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReg}
                    className="flex-1 py-2.5 rounded-xl bg-[#9B0302] hover:bg-[#800201] text-xs font-semibold text-white transition-all shadow-md shadow-[#9B0302]/20 hover:shadow-lg hover:shadow-[#9B0302]/30 active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {submittingReg ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
