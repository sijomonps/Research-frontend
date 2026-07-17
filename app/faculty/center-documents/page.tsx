"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, Download, X } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { facultyNav } from "@/data/roleNav";
import { apiGet, apiPostForm, apiDelete } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type CenterDoc = {
  _id: string;
  title: string;
  fileUrl: string;
  fileName?: string;
  uploadedAt?: string;
  uploadedBy?: { name?: string };
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CenterDocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<CenterDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const centerId = user?.researchCenter?._id || user?.researchCenter;

  // Load documents from user preferences (stored locally for MVP)
  useEffect(() => {
    const loadDocs = async () => {
      if (!user?._id) return;
      try {
        setLoading(true);
        setError(null);
        // Try to load from backend if endpoint exists
        try {
          const res = await apiGet<{ items: CenterDoc[] }>(
            `/research-centers/${centerId}/documents`
          );
          setDocs(res.items || []);
        } catch {
          // Fallback: load from localStorage
          const saved = localStorage.getItem(`center_docs_${centerId}`);
          setDocs(saved ? JSON.parse(saved) : []);
        }
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, [user?._id, centerId]);

  const persistDocs = (updated: CenterDoc[]) => {
    localStorage.setItem(`center_docs_${centerId}`, JSON.stringify(updated));
    setDocs(updated);
  };

  const handleUpload = async () => {
    if (!docTitle.trim() || !docFile) {
      alert("Please provide a title and select a file.");
      return;
    }
    setUploading(true);
    try {
      // Upload file to server
      const formData = new FormData();
      formData.append("file", docFile);
      const uploadRes = await apiPostForm<{ fileUrl: string; fileName?: string }>(
        "/uploads",
        formData
      );

      const newDoc: CenterDoc = {
        _id: `doc_${Date.now()}`,
        title: docTitle.trim(),
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName || docFile.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: { name: user?.name },
      };

      const updated = [newDoc, ...docs];
      persistDocs(updated);
      setDocTitle("");
      setDocFile(null);
      setShowUpload(false);
    } catch (err) {
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: CenterDoc) => {
    if (!window.confirm(`Delete "${doc.title}"?`)) return;
    const updated = docs.filter((d) => d._id !== doc._id);
    persistDocs(updated);
  };

  return (
    <PageLayout
      title="Center Documents"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Center Documents"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">
              Center Documents
            </h2>
            <p className="text-sm text-slate-500">
              Upload and manage documents for your Research Centre.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-900)] transition"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {/* Document List */}
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading documents...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No documents yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Click &quot;Upload Document&quot; to add the first document.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {docs.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between gap-4 py-3.5 hover:bg-slate-50 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#9B0302]/8 border border-[#9B0302]/10">
                      <FileText className="h-4 w-4 text-[#9B0302]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {doc.fileName && <span className="mr-2">{doc.fileName}</span>}
                        {doc.uploadedBy?.name && <span>by {doc.uploadedBy.name}</span>}
                        {doc.uploadedAt && <span className="ml-2">· {formatDate(doc.uploadedAt)}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-slate-50 transition"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Upload Document
              </h3>
              <button
                type="button"
                onClick={() => { setShowUpload(false); setDocTitle(""); setDocFile(null); }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Research Centre Guidelines 2024"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Supported: PDF, DOC, DOCX, XLS, XLSX, images (max 10 MB)
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button
                type="button"
                onClick={() => { setShowUpload(false); setDocTitle(""); setDocFile(null); }}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#800201] text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
