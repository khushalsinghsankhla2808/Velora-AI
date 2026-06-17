// PATH: frontend/src/components/CollaborationPanel.jsx
import React, { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Shield, Loader2, AlertCircle, Check } from "lucide-react";
import axios from "axios";

export default function CollaborationPanel({ projectId }) {
  const [owner, setOwner] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCollaborators = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/collaborators`,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setOwner(res.data.data.owner);
        setMembers(res.data.data.members || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load collaborators. Ensure you are authorized.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAddLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/collaborators`,
        { email, role },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setEmail("");
        setSuccess(`Successfully added ${email} as collaborator!`);
        await fetchCollaborators();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || "Failed to add collaborator.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (removeLoadingId) return;
    setRemoveLoadingId(userId);
    setError("");
    setSuccess("");
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/collaborators/${userId}`,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setSuccess("Collaborator removed successfully.");
        await fetchCollaborators();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to remove collaborator.");
    } finally {
      setRemoveLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 text-zinc-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-2">
        <Users className="text-purple-400" size={16} />
        <span className="font-semibold text-sm">Team Collaboration</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-1.5">
            <Check size={14} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="space-y-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl">
          <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Invite Member</p>
          <div className="space-y-2.5">
            <input
              type="email"
              placeholder="collaborator@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
              required
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500/50 cursor-pointer"
              >
                <option value="editor" className="bg-zinc-900">Editor (Write Access)</option>
                <option value="viewer" className="bg-zinc-900">Viewer (Read Only)</option>
              </select>
              <button
                type="submit"
                disabled={addLoading || !email.trim()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-4 rounded-xl flex items-center justify-center gap-1.5 hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {addLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <UserPlus size={14} />
                )}
                Invite
              </button>
            </div>
          </div>
        </form>

        {/* Members List */}
        <div className="space-y-4">
          <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Project Members</p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="animate-spin text-purple-500 mr-2" size={16} />
              Loading team...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Owner Item */}
              {owner && (
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={owner.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${owner.name}`}
                      alt={owner.name}
                      className="w-7 h-7 rounded-full bg-white/10"
                    />
                    <div>
                      <h4 className="font-semibold text-zinc-100 flex items-center gap-1">
                        {owner.name}
                        <Shield size={11} className="text-purple-400" title="Project Owner" />
                      </h4>
                      <p className="text-[10px] text-zinc-500">{owner.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Owner</span>
                </div>
              )}

              {/* Collaborators List */}
              {members.length === 0 ? (
                <div className="text-center py-6 text-zinc-600 italic">No team members invited yet.</div>
              ) : (
                members.map((member) => (
                  <div key={member.user._id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user.name}`}
                        alt={member.user.name}
                        className="w-7 h-7 rounded-full bg-white/10"
                      />
                      <div>
                        <h4 className="font-semibold text-zinc-100">{member.user.name}</h4>
                        <p className="text-[10px] text-zinc-500">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemove(member.user._id)}
                        disabled={removeLoadingId !== null}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 transition cursor-pointer"
                        title="Remove member"
                      >
                        {removeLoadingId === member.user._id ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
