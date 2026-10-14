import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, BookOpen, Layers, PlusCircle, Wrench } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside
      className="w-64 flex flex-col shadow-xl
        bg-gradient-to-b from-blue-950 to-blue-900 text-white
        dark:from-gray-900 dark:to-gray-800 dark:text-gray-100
        lg:w-72 transition-colors duration-300"
      style={{ minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="p-6 border-b border-blue-800 dark:border-gray-700">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <span className="p-2 rounded-full bg-blue-600 dark:bg-gray-600">
            <BookOpen size={24} />
          </span>
          Admin Dashboard
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
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
                  `flex items-center gap-3 p-3 rounded-lg text-lg font-medium transition-all duration-300 
                  ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100'
                      : 'text-blue-200 hover:bg-blue-800 hover:text-white dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white'
                  } 
                  hover:shadow-glow`
                }
              >
                <span className="text-blue-300 dark:text-gray-400 group-hover:text-white">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-blue-800 dark:border-gray-700">
        <p className="text-sm text-blue-300 dark:text-gray-400">
          © 2025 Admin Panel
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;