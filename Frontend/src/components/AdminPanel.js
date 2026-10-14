import React from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import ModuleList from './ModuleList';
import AddModule from './AddModule';
import { AddCourse } from './AddCourse';
import ModuleDetail from './ModuleDetail';
import Sidebar from './AdminSlidebar';
import { AdminCoursePanel } from './AdminCoursesPanel';
import { motion } from 'framer-motion';
import { BookOpen, Layers, PlusCircle, Wrench, Users, BarChart2, Settings, AlertCircle, Clock, FileText, MessageSquare, Shield } from 'lucide-react';

const AdminPanel = () => {
  const quickLinks = [
    {
      to: '/admincourses',
      icon: <BookOpen size={24} />,
      label: 'Manage Courses',
      description: 'Add, edit or delete courses.',
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-300'
    },
    {
      to: '/course/add-module',
      icon: <PlusCircle size={24} />,
      label: 'Add Module',
      description: 'Add new modules to courses.',
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-300'
    },
    {
      to: '/course/modules',
      icon: <Layers size={24} />,
      label: 'Module List',
      description: 'View all course modules.',
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-300'
    },
    {
      to: '/admin/skills',
      icon: <Wrench size={24} />,
      label: 'Manage Skills',
      description: 'Manage course-related skills.',
      color: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-600 dark:text-yellow-300'
    },
    {
      to: '/admin/users',
      icon: <Users size={24} />,
      label: 'User Management',
      description: 'View and manage platform users.',
      color: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-600 dark:text-red-300'
    },
    {
      to: '/admin/analytics',
      icon: <BarChart2 size={24} />,
      label: 'Analytics',
      description: 'View platform statistics.',
      color: 'bg-indigo-100 dark:bg-indigo-900',
      textColor: 'text-indigo-600 dark:text-indigo-300'
    }
  ];

  // Sample data for statistics
  const stats = [
    { value: '25', label: 'Total Users', change: '+12%', trend: 'up' },
    { value: '6', label: 'Active Courses', change: '+20%', trend: 'up' },
    { value: '48', label: 'Modules', change: '+8%', trend: 'up' },
    { value: '4', label: 'Pending Tasks', change: '-3%', trend: 'down' }
  ];

  // Recent activities
  const activities = [
    { id: 1, icon: <PlusCircle size={16} />, text: 'New course "Advanced React" added', time: '2 mins ago' },
    { id: 2, icon: <Users size={16} />, text: '15 new users registered', time: '15 mins ago' },
    { id: 3, icon: <FileText size={16} />, text: 'Module 3 updated in "JavaScript Basics"', time: '1 hour ago' },
    { id: 4, icon: <MessageSquare size={16} />, text: '5 new support tickets received', time: '3 hours ago' }
  ];

  // Recent tickets
  const tickets = [
    { id: 1, title: 'Login issues', status: 'Open', priority: 'High', assigned: 'You' },
    { id: 2, title: 'Course payment failed', status: 'Pending', priority: 'Medium', assigned: 'Team' },
    { id: 3, title: 'Certificate generation', status: 'In Progress', priority: 'Low', assigned: 'You' }
  ];

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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {new Date().toLocaleString()}
            </p>
          </motion.div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              <Settings size={20} />
            </button>
            <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              <AlertCircle size={20} />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                AD
              </div>
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-12">
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
                  Welcome back, Admin!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Here's what's happening with your platform today.
                </p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center space-x-2">
                <Shield size={18} />
                <span>Admin Settings</span>
              </button>
            </div>

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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-200">{stat.value}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      stat.trend === 'up' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        stat.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.random() * 70 + 30}%` }}
                    ></div>
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
                      className={`flex flex-col gap-3 p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition border-l-4 ${item.textColor.replace('text', 'border')}`}
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
                <ul className="space-y-4">
                  {activities.map(activity => (
                    <li key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${activity.id % 2 === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'}`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.text}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <Clock size={12} className="mr-1" /> {activity.time}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  View All Activity
                </button>
              </div>

              {/* Recent Tickets */}
              
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
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-medium">
                All Systems Operational
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart2 className="text-green-600 dark:text-green-300" size={20} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">API</p>
                <p className="font-medium text-green-600 dark:text-green-300">Online</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="text-green-600 dark:text-green-300" size={20} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Database</p>
                <p className="font-medium text-green-600 dark:text-green-300">Online</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="text-green-600 dark:text-green-300" size={20} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Auth Service</p>
                <p className="font-medium text-green-600 dark:text-green-300">Online</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-green-600 dark:text-green-300" size={20} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
                <p className="font-medium text-green-600 dark:text-green-300">Online</p>
              </div>
            </div>
          </motion.section>

          {/* Routing Area */}
          <section>
            <Routes>
              <Route path="/course/:courseId/modules" element={<ModuleList />} />
              <Route path="/course/:courseId/module/:moduleNumber" element={<ModuleDetail />} />
              <Route path="/course/:courseId/add-module" element={<AddModule />} />
              <Route path="/addcourse" element={<AddCourse />} />
              <Route path="/admincourses" element={<AdminCoursePanel />} />
              <Route
                path="/admin/users"
                element={
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">User management coming soon...</p>
                  </div>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">Analytics dashboard coming soon...</p>
                  </div>
                }
              />
            </Routes>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;