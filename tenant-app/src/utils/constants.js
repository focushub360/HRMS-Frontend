// Use local backend during development to match local DB state.
//export const API_BASE_URL = 'http://localhost:5000/api';
//console l

export const API_BASE_URL = 'https://hrm-backend-axau.onrender.com/api';

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  SUPPORT: 'support'
};

// Subscription Plans (INR)
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'INR',
    maxEmployees: 10,
    features: ['Core HR tools', '5 Employee seats', 'Email notifications']
  },
  basic: {
    name: 'Starter',
    price: 1499,
    currency: 'INR',
    maxEmployees: 50,
    features: ['Advanced HR workflows', '50 Employee seats', 'Email & chat support']
  },
  premium: {
    name: 'Growth',
    price: 3999,
    currency: 'INR',
    maxEmployees: 200,
    features: ['Full HR suite', '200 Employee seats', 'Priority support', 'Analytics dashboard']
  },
  enterprise: {
    name: 'Enterprise',
    price: 9999,
    currency: 'INR',
    maxEmployees: 1000,
    features: ['Custom HR stack', '1000+ Employee seats', '24/7 support', 'Custom integrations']
  }
};

// Company Sizes
export const COMPANY_SIZES = [
  '1-10',
  '11-50', 
  '51-200',
  '201-500',
  '501-1000',
  '1000+'
];

// Industries
export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Construction',
  'Transportation',
  'Other'
];

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold'
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  DONE: 'done'
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};


export const SIDEBAR_MENU = {
  admin: [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      children: [],
    },
    {
      title: 'Employee Management',
      path: '/employees',
      icon: '👥',
        children: [
        { title: 'All Employees', path: '/employees' },
        { title: 'Add Employee', path: '/employees/add' },
        // { title: 'Team Structure', path: '/team-management' },
      ],
    },
    {
      title: 'Attendance',
      path: '/attendance',
      icon: '⏰',
      children: [
        { title: 'My Attendance', path: '/attendance' },
        { title: 'Attendance Report', path: '/attendance/report' },
        { title: 'Daily Updates', path: '/attendance/daily-updates' },
      ],
    },
     {
      title: 'Project Management',
      path: '/projects',
      icon: '📋',
      children: [
        { title: 'All Projects', path: '/projects' },
        { title: 'Task Board', path: '/projects/board' },
        { title: 'Task Progress', path: '/tasks/progress' },
        { title: 'Create Project', path: '/projects/create' }
      ]
    },
    {
      title: 'Leave Management',
      path: '/leaves',
      icon: '📅',
      children: [
        { title: 'All Leaves', path: '/leaves' },
        { title: 'Pending Approval', path: '/leaves/pending' },
      ],
    },
    {
      title: 'Permission Management',
      path: '/permissions',
      icon: '⏰',
      children: [
        { title: 'All Permission', path: '/attendance/permissions' },
        { title: 'Permission History', path: '/permissions/history' },
      ],
    },
    {
      title: 'Payroll',
      path: '/payroll',
      icon: '💰',
      children: [
        { title: 'Payroll Records', path: '/payroll' },
        // { title: 'Generate Payroll', path: '/payroll/summary' }
      ],
    },
     {
      title: 'Analytics',
      path: '/analytics',
      icon: '📈',
      children: [],
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: '⚙️',
      children: [
        { title: 'Profile', path: '/settings' },
        { title: 'Shift Management', path: '/settings/shifts' },
        { title: 'Location Management', path: '/settings/locations' },
      ],
    },
    
  ],
  employee: [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      children: [],
    },
    {
      title: 'My Profile',
      path: '/profile',
      icon: '👤',
      children: [],
    },
    {
      title: 'Attendance',
      path: '/attendance',
      icon: '⏰',
      children: [
        { title: 'My Attendance', path: '/attendance' },
        { title: 'My Permissions', path: '/attendance/my-permissions' },
      ],
    },
     {
           title: 'My Projects',
           path: '/projects',
           icon: '📋',
           children: [
             { title: 'My Tasks', path: '/projects' },
             { title: 'Task Board', path: '/projects/board' }
             ,{ title: 'My Daily Work', path: '/projects/daily' }

          ]
       },
    {
      title: 'Leaves',
      path: '/leaves',
      icon: '📅',
      children: [
        { title: 'My Leaves', path: '/leaves' },
        { title: 'Apply Leave', path: '/leaves/apply' },
      ],
    },
    {
      title: 'Payroll',
      path: '/payroll',
      icon: '💰',
      children: [],
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: '⚙️',
      children: [],
    },
  ],
   teamlead: [
       {
         title: 'Dashboard',
         path: '/dashboard',
         icon: '📊',
         children: [],

     },
     {
         title: 'My Profile',
         path: '/profile',
         icon: '👤',
         children: [],

     },
     {
         title: 'Attendance',
         path: '/attendance',
         icon: '⏰',
         children: [
           { title: 'My Attendance', path: '/attendance' },
           { title: 'My Permissions', path: '/attendance/my-permissions' },

       ],
   },
     {
         title: 'Team Management',
         path: '/team-management',
         icon: '👥',
         children: [
           { title: 'Team Leaves', path: '/team-management/leaves' },
           { title: 'Team Permissions', path: '/team-management/permissions' },

       ],
   },
     {
         title: 'My Projects',
         path: '/projects',
         icon: '📋',
         children: [
           { title: 'My Tasks', path: '/projects' },
           { title: 'Task Board', path: '/projects/board' },
           { title: 'My Daily Work', path: '/projects/daily' }

       ]
   },
     {
         title: 'Leaves',
         path: '/leaves',
         icon: '📅',
         children: [
           { title: 'My Leaves', path: '/leaves' },
           { title: 'Apply Leave', path: '/leaves/apply' },

       ],
   },
     {
         title: 'Payroll',
         path: '/payroll',
         icon: '💰',
         children: [],

     },
     {
         title: 'Settings',
         path: '/settings',
         icon: '⚙️',
         children: [],

     },
 ],
};
 export const LEAVE_TYPES = {
  sick: { label: 'Sick Leave', color: 'bg-red-100 text-red-800' },
  casual: { label: 'Casual Leave', color: 'bg-blue-100 text-blue-800' },
  annual: { label: 'Annual Leave', color: 'bg-green-100 text-green-800' },
  maternity: { label: 'Maternity Leave', color: 'bg-pink-100 text-pink-800' },
  paternity: {
    label: 'Paternity Leave',
    color: 'bg-purple-100 text-purple-800',
  },
  other: { label: 'Other Leave', color: 'bg-gray-100 text-gray-800' },
  'comp-off': { label: 'Comp Off', color: 'bg-yellow-100 text-yellow-800' },
};

// Notification Types
export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task-assigned',
  TASK_UPDATED: 'task-updated',
  PROJECT_ASSIGNED: 'project-assigned',
  DEADLINE_REMINDER: 'deadline-reminder',
  GENERAL: 'general'
};
