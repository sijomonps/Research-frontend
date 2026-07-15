"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  FileText,
  NotebookText,
  Users,
  Plus,
  Settings,
  X,
  Edit2,
  Trash2,
  Award
} from "lucide-react";
import { DashboardCards } from "@/components/DashboardCards";
import { PageLayout } from "@/components/PageLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/Table";
import { researchGuideNav } from "@/data/roleNav";
import { apiGet, apiPatchJson, apiPostForm, apiDelete, transformGoogleDriveLink, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Submission = {
  _id: string;
  title: string;
  department: string;
  submittedAt?: string;
  status: string;
  scholar?: { name?: string };
};

type UserType = {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  department?: string;
  designation?: string;
  uniqueId?: string;
  avatar?: string;
  preferences?: any;
};

// Initial research guide registry tabs
const DEFAULT_RESEARCH_GUIDE_TABS = [
  { id: "scholars", label: "Guided Scholars", isPredefined: true, columns: ["Sl.No.", "Scholar Name", "Research Topic", "Registration Date", "Status"] },
  { id: "publications", label: "Research Publications", isPredefined: true, columns: ["Sl.No.", "Publication Title", "Journal Name", "Year of Publication", "Impact Factor"] },
  { id: "projects", label: "Funded Projects", isPredefined: true, columns: ["Sl.No.", "Project Title", "Funding Agency", "Amount Sanctioned", "Status"] },
  { id: "patents", label: "Patents Filed/Granted", isPredefined: true, columns: ["Sl.No.", "Patent Title", "Application No.", "Filing Date", "Status"] },
  { id: "qualifications", label: "Educational qualifications", isPredefined: true, columns: ["Sl.No.", "Qualification", "Area of Specialization", "Year of Passing", "Institution"] },
];

const DEFAULT_RESEARCH_GUIDE_TABS_DATA: Record<string, any[]> = {
  scholars: [],
  publications: [],
  projects: [],
  patents: [],
  qualifications: []
};

const defaultMetrics = [
  { label: "Total scholars", value: "0", icon: Users },
  { label: "Pending reviews", value: "0", icon: ClipboardCheck },
  { label: "Recent submissions", value: "0", icon: FileText },
  { label: "Approval requests", value: "0", icon: NotebookText },
];

const submissionColumns = [
  { key: "title", label: "Title" },
  { key: "scholar", label: "Scholar" },
  { key: "department", label: "Research Center" },
  { key: "submitted", label: "Submitted On" },
  { key: "status", label: "Status", align: "right" as const },
];

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const approvalColumns = [
  { key: "title", label: "Title" },
  { key: "scholar", label: "Scholar" },
  { key: "submitted", label: "Submitted On" },
  { key: "status", label: "Status", align: "right" as const },
];

export default function ResearchGuideDashboard() {
  const router = useRouter();
  const { user, login, logout } = useAuth();
  
  // Dashboard metrics & content states
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [approvals, setApprovals] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab configurations
  const [tabsList, setTabsList] = useState<any[]>([]);
  const [activeTabs, setActiveTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [customTabsData, setCustomTabsData] = useState<Record<string, any[]>>({});

  // Modal triggers
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);

  // Custom delete confirmation modal state
  const [deleteConfirmType, setDeleteConfirmType] = useState<"tab" | "row" | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number>(-1);

  // Profile fields state
  const [profileName, setProfileName] = useState("");
  const [profileDesignation, setProfileDesignation] = useState("");
  const [profileUniqueId, setProfileUniqueId] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileExpertise, setProfileExpertise] = useState("");
  const [profileGuidedScholars, setProfileGuidedScholars] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");

  // New tab form
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabColumns, setNewTabColumns] = useState("");

  // New row form
  const [newRowValues, setNewRowValues] = useState<Record<string, string>>({});

  // Initialize and load dynamic database states
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [scholarsRes, submissionsRes, pendingRes, approvalsRes] = await Promise.all([
          apiGet<ApiListResponse<any>>("/users?role=scholar"),
          apiGet<ApiListResponse<Submission>>("/submissions"),
          apiGet<ApiListResponse<Submission>>("/submissions?status=Pending"),
          apiGet<ApiListResponse<Submission>>("/approvals?status=Pending"),
        ]);

        if (!isMounted) return;

        setMetrics([
          { label: "Total scholars", value: `${scholarsRes.items.length}`, icon: Users },
          { label: "Pending reviews", value: `${pendingRes.items.length}`, icon: ClipboardCheck },
          { label: "Recent submissions", value: `${submissionsRes.items.length}`, icon: FileText },
          { label: "Approval requests", value: `${approvalsRes.items.length}`, icon: NotebookText },
        ]);

        setSubmissions(submissionsRes.items.slice(0, 4));
        setApprovals(approvalsRes.items.slice(0, 4));
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load directory metrics");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Load active tab layout and records from localStorage/preferences
    if (typeof window !== "undefined" && user?._id) {
      const userIdKey = user._id;
      const prefTabs = user?.preferences?.research_guide_tabs_config;
      const prefActive = user?.preferences?.research_guide_active_tabs;
      const prefData = user?.preferences?.research_guide_custom_tabs_data;

      const savedTabs = prefTabs ? JSON.stringify(prefTabs) : localStorage.getItem(`research_guide_${userIdKey}_tabs_config`);
      const savedActive = prefActive ? JSON.stringify(prefActive) : localStorage.getItem(`research_guide_${userIdKey}_active_tabs`);
      const savedData = prefData ? JSON.stringify(prefData) : localStorage.getItem(`research_guide_${userIdKey}_custom_tabs_data`);

      if (savedTabs) {
        setTabsList(JSON.parse(savedTabs));
      } else {
        localStorage.setItem(`research_guide_${userIdKey}_tabs_config`, JSON.stringify(DEFAULT_RESEARCH_GUIDE_TABS));
        setTabsList(DEFAULT_RESEARCH_GUIDE_TABS);
      }

      if (savedActive) {
        const parsedActive = JSON.parse(savedActive);
        setActiveTabs(parsedActive);
        if (parsedActive.length > 0) setSelectedTab(parsedActive[0]);
      } else {
        const defaultActive = DEFAULT_RESEARCH_GUIDE_TABS.map((t) => t.id);
        localStorage.setItem(`research_guide_${userIdKey}_active_tabs`, JSON.stringify(defaultActive));
        setActiveTabs(defaultActive);
        setSelectedTab(defaultActive[0]);
      }

      if (savedData) {
        setCustomTabsData(JSON.parse(savedData));
      } else {
        localStorage.setItem(`research_guide_${userIdKey}_custom_tabs_data`, JSON.stringify(DEFAULT_RESEARCH_GUIDE_TABS_DATA));
        setCustomTabsData(DEFAULT_RESEARCH_GUIDE_TABS_DATA);
      }

      // Load Profile fields from database or localstorage
      setProfileName(user?.name || localStorage.getItem(`research_guide_${userIdKey}_profile_name`) || "");
      setProfileDesignation(user?.designation || localStorage.getItem(`research_guide_${userIdKey}_profile_designation`) || "Research Guide");
      setProfileUniqueId(user?.uniqueId || localStorage.getItem(`research_guide_${userIdKey}_profile_unique_id`) || `MCKA-GUIDE-${user._id.slice(-4).toUpperCase()}`);
      setProfileEmail(user?.email || localStorage.getItem(`research_guide_${userIdKey}_profile_email`) || "");
      setProfileDept(user?.department || localStorage.getItem(`research_guide_${userIdKey}_profile_dept`) || "");
      setProfileAvatar(user?.avatar || localStorage.getItem(`research_guide_${userIdKey}_profile_avatar`) || "");
      setProfileExpertise(user?.preferences?.research_guide_profile_expertise || localStorage.getItem(`research_guide_${userIdKey}_profile_expertise`) || "");
      setProfileGuidedScholars(user?.preferences?.research_guide_profile_guided_scholars || localStorage.getItem(`research_guide_${userIdKey}_profile_guided_scholars`) || "");
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const syncPreferences = async (updatedPrefs: any) => {
    if (user?._id) {
      try {
        const res: any = await apiPatchJson(`/users/${user._id}`, {
          preferences: {
            ...(user.preferences || {}),
            ...updatedPrefs
          }
        });
        if (res?.item) login("", res.item);
      } catch (err) {
        console.error("Failed to sync preferences to backend:", err);
      }
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiPostForm<{ fileUrl: string }>("/uploads", formData);
      if (res.fileUrl) {
        setProfileAvatar(res.fileUrl);
      }
    } catch (err) {
      alert("Failed to upload image.");
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) return;
    try {
      await apiDelete(`/users/${user?._id}`);
      logout();
      router.push("/");
    } catch (err) {
      alert("Failed to delete account. Please ensure you have permission.");
    }
  };

  // Save profile edits
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      alert("Name is required.");
      return;
    }
    if (!user?._id) return;
    const userIdKey = user._id;
    
    // Write profile data to localStorage
    localStorage.setItem(`research_guide_${userIdKey}_profile_name`, profileName);
    localStorage.setItem(`research_guide_${userIdKey}_profile_designation`, profileDesignation);
    localStorage.setItem(`research_guide_${userIdKey}_profile_unique_id`, profileUniqueId);
    localStorage.setItem(`research_guide_${userIdKey}_profile_email`, profileEmail);
    localStorage.setItem(`research_guide_${userIdKey}_profile_dept`, profileDept);
    localStorage.setItem(`research_guide_${userIdKey}_profile_avatar`, profileAvatar);
    localStorage.setItem(`research_guide_${userIdKey}_profile_expertise`, profileExpertise);
    localStorage.setItem(`research_guide_${userIdKey}_profile_guided_scholars`, profileGuidedScholars);

    // Patch global user context
    try {
      const updatedUser = await apiPatchJson<UserType>(`/users/${user._id}`, {
        name: profileName,
        email: profileEmail,
        department: profileDept,
        designation: profileDesignation,
        uniqueId: profileUniqueId,
        avatar: transformGoogleDriveLink(profileAvatar),
        preferences: {
          ...(user.preferences || {}),
          research_guide_profile_expertise: profileExpertise,
          research_guide_profile_guided_scholars: profileGuidedScholars
        }
      });
      login("", updatedUser);
    } catch (err) {
      console.error("Local context synchronization failed:", err);
    }

    setShowEditProfileModal(false);
  };

  // Toggle active tab state
  const toggleTabCheckbox = (tabId: string) => {
    if (!user?._id) return;
    const userIdKey = user._id;
    let nextActive: string[];
    if (activeTabs.includes(tabId)) {
      nextActive = activeTabs.filter((id) => id !== tabId);
    } else {
      nextActive = [...activeTabs, tabId];
    }
    setActiveTabs(nextActive);
    localStorage.setItem(`research_guide_${userIdKey}_active_tabs`, JSON.stringify(nextActive));
    syncPreferences({ research_guide_active_tabs: nextActive });

    if (selectedTab === tabId && !nextActive.includes(tabId)) {
      setSelectedTab(nextActive[0] || "");
    }
  };

  // Add custom registry tabs
  const handleAddNewTab = () => {
    if (!newTabLabel.trim() || !newTabColumns.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    if (!user?._id) return;
    const userIdKey = user._id;

    const newId = newTabLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (tabsList.some((t) => t.id === newId)) {
      alert("A tab with this name already exists.");
      return;
    }

    const columnsArray = [
      "Sl.No.",
      ...newTabColumns.split(",").map((c) => c.trim()).filter(Boolean)
    ];

    const newTab = {
      id: newId,
      label: newTabLabel.trim(),
      isPredefined: false,
      columns: columnsArray
    };

    const nextList = [...tabsList, newTab];
    const nextActive = [...activeTabs, newId];

    setTabsList(nextList);
    setActiveTabs(nextActive);
    setSelectedTab(newId);

    localStorage.setItem(`research_guide_${userIdKey}_tabs_config`, JSON.stringify(nextList));
    localStorage.setItem(`research_guide_${userIdKey}_active_tabs`, JSON.stringify(nextActive));

    const nextData = { ...customTabsData, [newId]: [] };
    setCustomTabsData(nextData);
    localStorage.setItem(`research_guide_${userIdKey}_custom_tabs_data`, JSON.stringify(nextData));

    syncPreferences({
      research_guide_tabs_config: nextList,
      research_guide_active_tabs: nextActive,
      research_guide_custom_tabs_data: nextData
    });

    setNewTabLabel("");
    setNewTabColumns("");
    setShowAddTabModal(false);
  };

  // Delete custom tab configuration
  const confirmDeleteTab = (tabId: string) => {
    setDeleteConfirmType("tab");
    setDeleteTargetId(tabId);
  };

  const handleDeleteTabConfirmed = () => {
    const tabId = deleteTargetId;
    if (!user?._id) return;
    const userIdKey = user._id;

    const nextList = tabsList.filter((t) => t.id !== tabId);
    const nextActive = activeTabs.filter((id) => id !== tabId);

    setTabsList(nextList);
    setActiveTabs(nextActive);

    localStorage.setItem(`research_guide_${userIdKey}_tabs_config`, JSON.stringify(nextList));
    localStorage.setItem(`research_guide_${userIdKey}_active_tabs`, JSON.stringify(nextActive));

    const nextData = { ...customTabsData };
    delete nextData[tabId];
    setCustomTabsData(nextData);
    localStorage.setItem(`research_guide_${userIdKey}_custom_tabs_data`, JSON.stringify(nextData));

    syncPreferences({
      research_guide_tabs_config: nextList,
      research_guide_active_tabs: nextActive,
      research_guide_custom_tabs_data: nextData
    });

    if (selectedTab === tabId) {
      setSelectedTab(nextActive[0] || "");
    }

    setDeleteConfirmType(null);
    setDeleteTargetId("");
  };

  // Add records row to active tab
  const handleAddNewRow = () => {
    const activeTabConfig = tabsList.find((t) => t.id === selectedTab);
    if (!activeTabConfig || !user?._id) return;
    const userIdKey = user._id;

    const nextData = { ...customTabsData };
    const currentRows = nextData[selectedTab] || [];
    currentRows.push(newRowValues);
    nextData[selectedTab] = currentRows;

    setCustomTabsData(nextData);
    localStorage.setItem(`research_guide_${userIdKey}_custom_tabs_data`, JSON.stringify(nextData));
    syncPreferences({ research_guide_custom_tabs_data: nextData });

    setNewRowValues({});
    setShowAddRowModal(false);
  };

  // Delete records row from active tab
  const confirmDeleteRow = (index: number) => {
    setDeleteConfirmType("row");
    setDeleteTargetIndex(index);
  };

  const handleDeleteRowConfirmed = () => {
    const index = deleteTargetIndex;
    if (!user?._id) return;
    const userIdKey = user._id;

    const nextData = { ...customTabsData };
    const currentRows = nextData[selectedTab] || [];
    const nextRows = currentRows.filter((_, idx) => idx !== index);
    nextData[selectedTab] = nextRows;

    setCustomTabsData(nextData);
    localStorage.setItem(`research_guide_${userIdKey}_custom_tabs_data`, JSON.stringify(nextData));
    syncPreferences({ research_guide_custom_tabs_data: nextData });

    setDeleteConfirmType(null);
    setDeleteTargetIndex(-1);
  };

  const activeTabConfig = useMemo(() => tabsList.find((t) => t.id === selectedTab), [tabsList, selectedTab]);
  const activeTabRows = useMemo(() => customTabsData[selectedTab] || [], [customTabsData, selectedTab]);

  const submissionRows = useMemo(
    () =>
      submissions.map((submission) => ({
        id: submission._id,
        title: submission.title,
        scholar: submission.scholar?.name ?? "Unknown",
        department: submission.department,
        submitted: formatDate(submission.submittedAt),
        status: <StatusBadge status={submission.status} />,
      })),
    [submissions]
  );

  const approvalRows = useMemo(
    () =>
      approvals.map((submission) => ({
        id: submission._id,
        title: submission.title,
        scholar: submission.scholar?.name ?? "Unknown",
        submitted: formatDate(submission.submittedAt),
        status: <StatusBadge status={submission.status} />,
      })),
    [approvals]
  );

  return (
    <PageLayout
      title="Research Guide Dashboard"
      userName={profileName || user?.name || "Research Guide"}
      roleLabel="Research Guide"
      navItems={researchGuideNav}
      activeItem="Dashboard"
    >
      <DashboardCards items={metrics} />

      {error ? (
        <p className="text-sm text-red-600 my-4">Failed to load dashboard: {error}</p>
      ) : null}

      {/* Profile details card integrated inside dashboard */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar frame */}
          <label className="w-32 h-32 md:w-36 md:h-36 relative rounded-lg overflow-hidden border border-[color:var(--border)] flex-shrink-0 bg-slate-50 flex items-center justify-center cursor-pointer group">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-[#9B0302] bg-red-50 group-hover:bg-red-100 transition-colors">
                {(profileName || user?.name || "RG").split(" ").map(n => n[0]).join("").substring(0, 2)}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">Change Photo</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          
          {/* Details */}
          <div className="flex-1 space-y-1.5 w-full">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#9B0302]">
                  {profileName || user?.name}
                </h2>
                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">{profileDesignation}</p>
              </div>
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            </div>
            
            <div className="pt-2 text-xs space-y-1.5 text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <span className="font-semibold text-slate-500">Unique ID : </span>
                <span className="font-bold text-slate-800">{profileUniqueId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Research Center : </span>
                <span className="font-bold text-slate-800">{profileDept} Research Center</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Email : </span>
                <span className="font-bold text-[#9B0302]">{profileEmail || user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Registry tables with dynamic, non-predefined active tabs */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[color:var(--border)] pb-3 mb-6 gap-3">
          <h2 className="font-display text-lg font-bold text-[#9B0302]">
            Research Guide Registry Portfolio
          </h2>
          <div className="flex items-center gap-2">
            {activeTabConfig ? (
              <button
                onClick={() => {
                  setNewRowValues({});
                  setShowAddRowModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#9B0302] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#7d0201] transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Record
              </button>
            ) : null}
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition shadow-sm"
            >
              <Settings className="h-3.5 w-3.5" />
              Configure Tabs
            </button>
          </div>
        </div>

        {/* Tab triggers list */}
        <div className="flex flex-wrap gap-2 border-b border-[color:var(--border)] pb-4 mb-4">
          {tabsList
            .filter((tab) => activeTabs.includes(tab.id))
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  selectedTab === tab.id
                    ? "border-[#9B0302] bg-red-50/50 text-[#9B0302] shadow-sm font-bold"
                    : "border-[color:var(--border)] bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          {tabsList.filter((tab) => activeTabs.includes(tab.id)).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No tabs selected. Click 'Configure Tabs' to display registry options.</p>
          ) : null}
        </div>

        {/* Selected tab table contents */}
        {activeTabConfig ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[color:var(--border)] text-slate-500 font-semibold uppercase tracking-wider">
                    {activeTabConfig.columns.map((col: string, idx: number) => (
                      <th key={idx} className="p-3.5">{col}</th>
                    ))}
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTabRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTabConfig.columns.length + 1} className="p-8 text-center text-slate-400 italic">
                        No records logged in this category. Click 'Add Record' to create a new entry.
                      </td>
                    </tr>
                  ) : (
                    activeTabRows.map((row: any, rIdx: number) => {
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/50 transition">
                          {activeTabConfig.columns.map((col: string, cIdx: number) => {
                            if (col === "Sl.No.") {
                              return <td key={cIdx} className="p-3.5 font-semibold text-slate-700">{rIdx + 1}</td>;
                            }
                            // Convert column names to standard keys
                            const normalizedKey = col.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                            return (
                              <td key={cIdx} className="p-3.5 text-slate-600">
                                {row[normalizedKey] || row[col] || row[col.toLowerCase()] || "-"}
                              </td>
                            );
                          })}
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => confirmDeleteRow(rIdx)}
                              className="p-1 rounded-lg border border-slate-100 text-rose-500 hover:bg-rose-50 transition"
                              title="Delete record row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Edit Research Guide Profile Details
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Designation</label>
                <input
                  type="text"
                  value={profileDesignation}
                  onChange={(e) => setProfileDesignation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Unique ID</label>
                  <input
                    type="text"
                    value={profileUniqueId}
                    onChange={(e) => setProfileUniqueId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Research Center</label>
                  <input
                    type="text"
                    value={profileDept}
                    onChange={(e) => setProfileDept(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>



              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Photo URL (Optional)</label>
                <input
                  type="text"
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(transformGoogleDriveLink(e.target.value))}
                  placeholder="You can also click your avatar directly to upload a file"
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>

              <div className="pt-4 border-t border-[color:var(--border)] space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Security Settings</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/${user?.role || "research-guide"}/profile/change-password`)}
                    className="px-4 py-2 rounded-xl border border-[color:var(--border)] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#7d0201] text-xs font-bold text-white transition shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Registry Tabs Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Configure Registry Tabs
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-slate-500">
                Choose which categories are active on your guide registry portfolio. You can also define your own custom tab layouts.
              </p>

              <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Standard & Custom Tabs</span>
                {tabsList.map((tab) => (
                  <div key={tab.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeTabs.includes(tab.id)}
                        onChange={() => toggleTabCheckbox(tab.id)}
                        className="rounded border-[color:var(--border)] text-[#9B0302] focus:ring-[#9B0302] h-3.5 w-3.5"
                      />
                      {tab.label}
                      {tab.isPredefined ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-normal">Predefined</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-[#9B0302] font-semibold">Custom</span>
                      )}
                    </label>
                    {!tab.isPredefined ? (
                      <button
                        onClick={() => confirmDeleteTab(tab.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition"
                        title="Delete custom tab config"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center border-t border-[color:var(--border)] pt-4">
              <button
                onClick={() => setShowAddTabModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#9B0302] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7d0201] shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Tab
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Tab Modal */}
      {showAddTabModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[color:var(--border)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Create Custom Registry Tab
              </h3>
              <button
                onClick={() => setShowAddTabModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tab Title / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Consultancy Projects"
                  value={newTabLabel}
                  onChange={(e) => setNewTabLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Columns (Comma-Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Client Name, Value (INR), Status"
                  value={newTabColumns}
                  onChange={(e) => setNewTabColumns(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Sl.No. is automatically added as the first column.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button
                onClick={() => setShowAddTabModal(false)}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewTab}
                className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#7d0201] text-xs font-bold text-white transition shadow-sm"
              >
                Create Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Registry Record Modal */}
      {showAddRowModal && activeTabConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Add record to {activeTabConfig.label}
              </h3>
              <button
                onClick={() => setShowAddRowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTabConfig.columns
                .filter((col: string) => col !== "Sl.No.")
                .map((col: string, idx: number) => {
                  const normalizedKey = col.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                  return (
                    <div key={idx}>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        {col}
                      </label>
                      <input
                        type="text"
                        value={newRowValues[normalizedKey] || ""}
                        onChange={(e) =>
                          setNewRowValues({
                            ...newRowValues,
                            [normalizedKey]: e.target.value
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                      />
                    </div>
                  );
                })}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button
                onClick={() => setShowAddRowModal(false)}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewRow}
                className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#7d0201] text-xs font-bold text-white transition shadow-sm"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmType !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[color:var(--border)] text-center">
            <X className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h3 className="font-display text-base font-bold text-slate-800">
              Are you absolutely sure?
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              {deleteConfirmType === "tab"
                ? "This will delete the custom tab and all rows associated with it. This action cannot be undone."
                : "This will remove the selected registry row. This action cannot be undone."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => {
                  setDeleteConfirmType(null);
                  setDeleteTargetId("");
                  setDeleteTargetIndex(-1);
                }}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={
                  deleteConfirmType === "tab"
                    ? handleDeleteTabConfirmed
                    : handleDeleteRowConfirmed
                }
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
