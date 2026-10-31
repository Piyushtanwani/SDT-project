import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './AdminSlidebar';
import { motion } from 'framer-motion';
import { BookOpen, Layers, PlusCircle, Wrench, Users, BarChart2, RefreshCw, Clock, Shield } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const AdminPanel = () => {
  const quickLinks = [
    {
      to: '/admincourses',
      icon: <BookOpen size={24} />,
      label: 'Manage Courses',
      description: 'Add, edit or delete courses.',
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-300',
      borderColor: 'border-blue-600 dark:border-blue-300'
    },
    {
      to: '/course/add-module',
      icon: <PlusCircle size={24} />,
      label: 'Add Module',
      description: 'Add new modules to courses.',
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-300',
      borderColor: 'border-green-700 dark:border-green-300'
    },
    {
      to: '/course/modules',
      icon: <Layers size={24} />,
      label: 'Module List',
      description: 'View all course modules.',
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-300',
      borderColor: 'border-purple-600 dark:border-purple-300'
    },
    {
      to: '/admin/skills',
      icon: <Wrench size={24} />,
      label: 'Manage Skills',
      description: 'Manage course-related skills.',
      color: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      borderColor: 'border-yellow-700 dark:border-yellow-300'
    },
    {
      to: '/admin/users',
      icon: <Users size={24} />,
      label: 'User Management',
      description: 'View and manage platform users.',
      color: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-600 dark:text-red-300',
      borderColor: 'border-red-600 dark:border-red-300'
    },
    {
      to: '/leaderboard',
      icon: <BarChart2 size={24} />,
      label: 'Leaderboard',
      description: 'See the top learners by score.',
      color: 'bg-indigo-100 dark:bg-indigo-900',
      textColor: 'text-indigo-600 dark:text-indigo-300',
      borderColor: 'border-indigo-600 dark:border-indigo-300'
    }
  ];

  const [stats, setStats] = useState([
    { label: 'Total Users', value: '—', detail: 'Registered accounts' },
    { label: 'Active Courses', value: '—', detail: 'In the catalog' },
    { label: 'Modules', value: '—', detail: 'Across all courses' },
    { label: 'Certificates', value: '—', detail: 'Issued to learners' },
  ]);
  const [activities, setActivities] = useState([]);
  const [health, setHealth] = useState({ api: false, database: false, auth: false });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const headers = getAuthHeaders();
      const [usersResult, coursesResult, certificatesResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/auth/getallusers`, { headers }),
        fetch(`${API_BASE_URL}/course/getCourses`),
        fetch(`${API_BASE_URL}/api/certificates/leaderboard`),
      ]);

      const sessionExpired = [usersResult, coursesResult, certificatesResult].some(
        (result) => result.status === 'fulfilled' && result.value.status === 401
      );
      if (sessionExpired) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }

      const readList = async (result) => {
        if (result.status !== 'fulfilled' || !result.value.ok) return null;
        try {
          const data = await result.value.json();
          return Array.isArray(data) ? data : null;
        } catch {
          return null;
        }
      };

      const [usersData, coursesData, certificatesData] = await Promise.all([
        readList(usersResult),
        readList(coursesResult),
        readList(certificatesResult),
      ]);

      const users = usersData || [];
      const courses = coursesData || [];
      const certificates = certificatesData || [];
      const moduleCount = courses.reduce(
        (total, course) => total + (Number(course.modulesCount) || 0),
        0
      );

      setStats([
        { label: 'Total Users', value: String(users.length), detail: 'Registered accounts' },
        { label: 'Active Courses', value: String(courses.length), detail: 'In the catalog' },
        { label: 'Modules', value: String(moduleCount), detail: 'Across all courses' },
        { label: 'Certificates', value: String(certificates.length), detail: 'Issued to learners' },
      ]);

      setActivities(
        [...users]
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 4)
          .map((user) => ({
            id: user.id,
            text: `${user.username || user.email || 'A new member'} joined the community`,
            time: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
          }))
      );

      setHealth({
        api: [usersResult, coursesResult, certificatesResult].some(
          (result) => result.status === 'fulfilled'
        ),
        database: coursesData !== null,
        auth: usersData !== null,
      });

      if ([usersData, coursesData, certificatesData].some((data) => data === null)) {
        setLoadError('Some dashboard data could not be loaded. Showing the latest available figures.');
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Admin dashboard failed to load:', error);
      setLoadError('The dashboard could not be loaded. Please try again.');
      setHealth({ api: false, database: false, auth: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const allOperational = health.api && health.database && health.auth;
  const statusLabel = isLoading
    ? 'Checking Services'
    : allOperational
      ? 'All Systems Operational'
      : 'Some Services Unavailable';
  const statusBadgeClass = isLoading
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    : allOperational
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

  const storedName = sessionStorage.getItem('userFirstName') || sessionStorage.getItem('userName');
  const displayName = storedName && storedName !== 'null' ? storedName : 'Admin';
  const nameParts = displayName.trim().split(/\s+/);
  const initials = (
    nameParts.length > 1
      ? nameParts.slice(0, 2).map((part) => part[0]).join('')
      : displayName.trim().slice(0, 2)
  ).toUpperCase() || 'AD';

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">
              LWL Admin Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Loading…'}
            </p>
          </motion.div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold"
                title={displayName}
              >
                {initials}
              </div>
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Welcome Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Welcome back, {displayName}!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Here's what's happening with your platform today.
                </p>
              </div>
              <Link
                to="/updateprofile"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center space-x-2"
              >
                <Shield size={18} />
                <span>Account Settings</span>
              </Link>
            </div>

            {loadError && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-200">{stat.value}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{stat.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2"
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quickLinks.map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Link
                      to={item.to}
                      className={`flex flex-col gap-3 p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition border-l-4 ${item.borderColor}`}
                    >
                      <div className={`p-3 rounded-full ${item.color} ${item.textColor} self-start`}>
                        {item.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.description}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Recent Activity */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Recent Activity</h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                {activities.length > 0 ? (
                  <ul className="space-y-4">
                    {activities.map((activity, index) => (
                      <li key={activity.id} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${index % 2 === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'}`}>
                          <Users size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.text}</p>
                          {activity.time && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                              <Clock size={12} className="mr-1" /> {activity.time}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading recent activity…' : 'No recent activity yet.'}
                  </p>
                )}
                <Link
                  to="/admin/users"
                  className="mt-6 block w-full py-2 text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Manage Users
                </Link>
              </div>
            </motion.section>
          </div>

          {/* System Status */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">System Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass}`}>
                {statusLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'API', icon: <BarChart2 size={20} />, online: health.api },
                { label: 'Database', icon: <BookOpen size={20} />, online: health.database },
                { label: 'Auth Service', icon: <Users size={20} />, online: health.auth },
              ].map((service) => (
                <div key={service.label} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    isLoading
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      : service.online
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                  }`}>
                    {service.icon}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{service.label}</p>
                  <p className={`font-medium ${
                    isLoading
                      ? 'text-gray-500 dark:text-gray-400'
                      : service.online
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-600 dark:text-red-300'
                  }`}>
                    {isLoading ? 'Checking…' : service.online ? 'Online' : 'Unavailable'}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
