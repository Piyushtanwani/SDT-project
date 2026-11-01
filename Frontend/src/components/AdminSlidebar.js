import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, BookOpen, Layers, PlusCircle, Wrench } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside
      className="w-64 lg:w-72 flex flex-col min-h-screen border-r border-gray-200/70 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200/70 dark:border-white/10">
        <p className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="p-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-white/10 dark:text-indigo-300">
            <BookOpen size={24} />
          </span>
          Admin Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4" aria-label="Admin navigation">
        <ul className="space-y-2">
          {[
            {
              to: '/admincourses',
              icon: <BookOpen size={20} />,
              label: 'Courses',
            },
            {
              to: '/admin/add-course',
              icon: <PlusCircle size={20} />,
              label: 'Add Course',
            },
            {
              to: '/course/modules',
              icon: <Layers size={20} />,
              label: 'Modules List',
            },
            {
              to: '/course/add-module',
              icon: <PlusCircle size={20} />,
              label: 'Add Module',
            },
            {
              to: '/admin/users',
              icon: <Users size={20} />,
              label: 'Users',
            },
            {
              to: '/admin/skills',
              icon: <Wrench size={20} />,
              label: 'Skills',
            },
          ].map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 p-3 rounded-xl text-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-white/10 dark:text-indigo-300 font-semibold'
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white font-medium'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/70 dark:border-white/10">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © 2026 Admin Panel
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;