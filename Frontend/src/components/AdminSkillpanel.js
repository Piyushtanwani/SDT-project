import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./AdminSlidebar";
import { X, Trash2, Edit, Plus, Search } from "lucide-react";

export const AdminSkillPanel = () => {
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [editSkillId, setEditSkillId] = useState(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [modalError, setModalError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const fetchSkills = useCallback(async () => {
    try {
      setLoadError("");
      const response = await axios.get(`${apiUrl}/api/skills`);
      setSkills(response.data);
      setFilteredSkills(response.data);
    } catch (error) {
      setLoadError("Could not load skills. Please try again.");
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    setFilteredSkills(
      skills.filter((skill) =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, skills]);

  const handleCreateSkill = async () => {
    const name = newSkillName.trim();
    if (!name) {
      setModalError("Enter a skill name.");
      return;
    }
    try {
      setIsSaving(true);
      setModalError("");
      const response = await axios.post(`${apiUrl}/api/skills`, { name });
      if (response.data.success) {
        setNewSkillName("");
        setIsModalOpen(false);
        fetchSkills();
      } else {
        setModalError(response.data.message || "Could not create skill.");
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Could not create skill. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSkill = async () => {
    const name = editSkillName.trim();
    if (!name) {
      setModalError("Enter a skill name.");
      return;
    }
    try {
      setIsSaving(true);
      setModalError("");
      const response = await axios.put(`${apiUrl}/api/skills/${editSkillId}`, {
        name,
      });
      if (response.data.success) {
        setEditSkillId(null);
        setEditSkillName("");
        setIsModalOpen(false);
        fetchSkills();
      } else {
        setModalError(response.data.message || "Could not update skill.");
      }
    } catch (error) {
      setModalError(
        error.response?.data?.message || "Could not update skill. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async () => {
    if (!selectedSkillId) return;
    try {
      setIsDeleting(true);
      setConfirmError("");
      await axios.delete(`${apiUrl}/api/skills/${selectedSkillId}`);
      setIsConfirmOpen(false);
      fetchSkills();
    } catch (error) {
      setConfirmError(
        error.response?.data?.message || "Could not delete skill. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col p-6">
        <h1 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400 mb-8">
          Admin Skill Panel
        </h1>

        <div className="flex justify-between items-center mb-8">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 dark:bg-gray-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              setEditSkillId(null);
              setNewSkillName("");
              setModalError("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 py-2 px-4 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Add Skill
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative"
            >
              <div className="p-6 flex items-center justify-center">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {skill.name}
                </h2>
              </div>

              <div className="absolute top-2 right-2 flex">
                <button
                  onClick={() => {
                    setEditSkillId(skill.id);
                    setEditSkillName(skill.name);
                    setModalError("");
                    setIsModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2"
                  aria-label={`Edit ${skill.name}`}
                  title={`Edit ${skill.name}`}
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => {
                    setSelectedSkillId(skill.id);
                    setConfirmError("");
                    setIsConfirmOpen(true);
                  }}
                  className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"
                  aria-label={`Delete ${skill.name}`}
                  title={`Delete ${skill.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredSkills.length === 0 && (
            <div className="col-span-full text-center py-10">
              {loadError ? (
                <>
                  <p className="text-red-600 dark:text-red-400 text-lg mb-4" role="alert">
                    {loadError}
                  </p>
                  <button
                    onClick={fetchSkills}
                    className="px-4 py-2 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-lg">No skills found.</p>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 z-50 p-4">
              <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  {editSkillId ? "Edit Skill" : "Add New Skill"}
                </h2>
                <input
                  type="text"
                  value={editSkillId ? editSkillName : newSkillName}
                  onChange={(e) =>
                    editSkillId
                      ? setEditSkillName(e.target.value)
                      : setNewSkillName(e.target.value)
                  }
                  placeholder="Enter skill name"
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:border-indigo-500"
                />
                {modalError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {modalError}
                  </p>
                )}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editSkillId ? handleUpdateSkill : handleCreateSkill}
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : editSkillId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isConfirmOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 z-50 p-4">
              <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Are you sure you want to delete this skill?
                </h2>
                {confirmError && (
                  <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                    {confirmError}
                  </p>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsConfirmOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSkill}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminSkillPanel;
