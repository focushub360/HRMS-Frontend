import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { projectService } from '../../services/projects';
import { useAuth } from '../../context/AuthContext';

// Material-UI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FlagIcon from '@mui/icons-material/Flag';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TaskIcon from '@mui/icons-material/Task';
import GroupIcon from '@mui/icons-material/Group';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import PersonIcon from '@mui/icons-material/Person';

const StatCard = ({ title, value, subtitle, icon, color, loading = false }) => (
  <Card className="group hover:shadow-lg transition-all duration-300">
    <Card.Content className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} transition-colors duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </Card.Content>
  </Card>
);

const TeamMemberCard = ({ employee, isCurrentUser = false }) => (
  <div className={`flex items-center space-x-3 p-4 bg-white rounded-lg border transition-all duration-200 ${
    isCurrentUser 
      ? 'border-primary-300 bg-primary-50 shadow-sm' 
      : 'border-gray-200 hover:shadow-md'
  }`}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
      isCurrentUser
        ? 'bg-gradient-to-br from-primary-600 to-primary-700'
        : 'bg-gradient-to-br from-gray-500 to-gray-600'
    }`}>
      <span className="text-white font-semibold text-sm">
        {employee.name?.charAt(0).toUpperCase()}
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <h4 className="font-semibold text-gray-900 truncate">{employee.name}</h4>
        {isCurrentUser && (
          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
            You
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 truncate">{employee.position}</p>
      <p className="text-xs text-gray-500 truncate">{employee.department}</p>
    </div>
  </div>
);

const TaskItem = ({ task, isAssignedToCurrentUser = false }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 border-gray-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      review: 'bg-orange-100 text-orange-800 border-orange-200',
      done: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all duration-200 group ${
      isAssignedToCurrentUser
        ? 'border-primary-300 bg-primary-50 hover:shadow-md'
        : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="flex items-center space-x-4 flex-1">
        <div className={`w-3 h-3 rounded-full ${
          task.priority === 'high' ? 'bg-red-500' :
          task.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
        }`}></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">
              {task.title}
            </h4>
            {isAssignedToCurrentUser && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                Your Task
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <ScheduleIcon className="w-3 h-3" />
              <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
            </div>
            {task.estimatedHours > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <ScheduleIcon className="w-3 h-3" />
                <span>Est: {task.estimatedHours}h</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
          {task.status.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUserEmployee, setCurrentUserEmployee] = useState(null);

  const isAdmin = user?.role === 'admin';

  const [autoUpdatingStatus, setAutoUpdatingStatus] = useState(false);

  // Auto-mark completed when all tasks are done (admin only)
  useEffect(() => {
    const completed = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (pct === 100 && project && project.status !== 'completed' && isAdmin && !autoUpdatingStatus) {
      const markCompleted = async () => {
        try {
          setAutoUpdatingStatus(true);
          const resp = await projectService.updateProject(project._id, { status: 'completed' });
          if (resp && resp.data && resp.data.data) setProject(resp.data.data);
          else setProject(prev => ({ ...(prev || {}), status: 'completed' }));
        } catch (err) {
          console.warn('Auto-update project status failed', err);
        } finally {
          setAutoUpdatingStatus(false);
        }
      };
      markCompleted();
    }
  }, [tasks, project, isAdmin, autoUpdatingStatus]);

  const loadProjectData = useCallback(async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectService.getProject(id),
        projectService.getTasks({ project: id })
      ]);

      const proj = projectRes.data.data;
      setProject(proj);
      setTasks(tasksRes.data.data || []);

      // Helper to determine if an employee entry relates to the current user
      const matchesCurrentUser = (emp) => {
        const empUserId = emp?.user?._id || emp?.user || emp?._id;
        const userIdsToCheck = [user?._id, user?.employee?._id, user?.employee]
          .filter(Boolean)
          .map(id => String(id));
        return userIdsToCheck.includes(String(empUserId));
      };

      // Check whether current user is assigned to the project
      const assigned = Array.isArray(proj?.assignedEmployees) && proj.assignedEmployees.some(emp => matchesCurrentUser(emp));

      // If logged-in user is an employee and not assigned, deny access (frontend guard)
      if (user?.role === 'employee' && !assigned) {
        setError('access_denied');
        setProject(null);
        setTasks([]);
        setCurrentUserEmployee(null);
        return;
      }

      // If assigned, set the currentEmployee reference
      if (assigned) {
        const currentEmployee = proj.assignedEmployees.find(emp => matchesCurrentUser(emp));
        setCurrentUserEmployee(currentEmployee);
      } else {
        setCurrentUserEmployee(null);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
      setError('general');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  

  const getStatusConfig = (status) => {
    const configs = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <PlayArrowIcon className="w-4 h-4" />,
        label: 'Active'
      },
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        label: 'Completed'
      },
      'on-hold': {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <PauseIcon className="w-4 h-4" />,
        label: 'On Hold'
      }
    };
    return configs[status] || configs.active;
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getMyTasks = () => {
    if (!currentUserEmployee) return [];
    return tasks.filter(task => task.assignedTo?._id === currentUserEmployee._id);
  };

  const isTaskAssignedToMe = (task) => {
    return currentUserEmployee && task.assignedTo?._id === currentUserEmployee._id;
  };

  const isEmployeeInTeam = (employee) => {
    return currentUserEmployee && employee._id === currentUserEmployee._id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!loading && error === 'access_denied') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FlagIcon className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access denied</h3>
        <p className="text-gray-500 mb-6">You don't have permission to view this project.</p>
        <Button as={Link} to="/projects">
          <ArrowBackIcon className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FlagIcon className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
        <p className="text-gray-500 mb-6">The project you're looking for doesn't exist or you don't have access.</p>
        <Button as={Link} to="/projects">
          <ArrowBackIcon className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  const daysRemaining = calculateDaysRemaining(project.endDate);
  const completedTasks = getTasksByStatus('done').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const myTasks = getMyTasks();
  const myCompletedTasks = myTasks.filter(task => task.status === 'done').length;
  const myProgressPercentage = myTasks.length > 0 ? Math.round((myCompletedTasks / myTasks.length) * 100) : 0;
  const activeTeamMembers = Array.isArray(project.assignedEmployees)
    ? project.assignedEmployees.filter(member => member?.isActive !== false)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-8 border border-primary-200 dark:bg-gray-800 dark:from-transparent dark:to-transparent dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="outline"
                onClick={() => navigate('/projects')}
                className="bg-white/80 backdrop-blur-sm border-primary-200 hover:bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <ArrowBackIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 w-fit ${statusConfig.color}`}>
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </span>
              {!isAdmin && currentUserEmployee && (
                <span className="px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-medium rounded-full border border-primary-200 flex items-center space-x-1">
                  <PersonIcon className="w-4 h-4" />
                  <span>Team Member</span>
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
              <p className="text-lg text-gray-700 leading-relaxed dark:text-gray-300">{project.description}</p>
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <CalendarTodayIcon className="w-4 h-4" />
                  <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FlagIcon className="w-4 h-4" />
                  <span>Due: {new Date(project.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MoreTimeIcon className="w-4 h-4" />
                  <span className={daysRemaining < 7 ? 'text-red-600 font-semibold' : ''}>
                    {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin ? (
              <>
                <Button
                  as={Link}
                  to={`/projects/edit/${project._id}`}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-primary-200 hover:bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Project
                </Button>
                <Button
                  as={Link}
                  to={`/projects/board?project=${project._id}`}
                  className="bg-primary-600 hover:bg-primary-700 border-0 shadow-lg dark:bg-primary-700 dark:hover:bg-primary-600"
                >
                  <ViewKanbanIcon className="w-4 h-4 mr-2" />
                  Task Board
                </Button>
              </>
            ) : (
              <Button
                as={Link}
                to={`/projects/board?project=${project._id}`}
                className="bg-primary-600 hover:bg-primary-700 border-0 shadow-lg dark:bg-primary-700 dark:hover:bg-primary-600"
              >
                <ViewKanbanIcon className="w-4 h-4 mr-2" />
                View Task Board
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Employee Personal Progress - Only show if employee has tasks */}
      {!isAdmin && myTasks.length > 0 && (
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">My Progress</h3>
                <p className="text-sm text-gray-600">Your personal task completion</p>
              </div>
              <span className="text-2xl font-bold text-primary-600">{myProgressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor(myProgressPercentage)}`}
                style={{ width: `${myProgressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{myCompletedTasks} of {myTasks.length} tasks completed</span>
              <span>{myProgressPercentage}% complete</span>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Project Progress */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isAdmin ? 'Project Progress' : 'Team Progress'}
              </h3>
              <p className="text-sm text-gray-600">
                {isAdmin ? 'Overall completion based on task status' : 'Overall team progress'}
              </p>
            </div>
            <span className="text-2xl font-bold text-primary-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor(progressPercentage)}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{completedTasks} of {totalTasks} tasks completed</span>
            <span>{progressPercentage}% complete</span>
          </div>
        </Card.Content>
      </Card>

      {/* Tabs Navigation */}
      <Card>
        <Card.Content className="p-0">
          <nav className="flex space-x-8 px-6 border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview', icon: <DashboardIcon className="w-4 h-4" /> },
              { id: 'tasks', label: isAdmin ? 'Tasks' : 'My Tasks', icon: <TaskIcon className="w-4 h-4" /> },
              { id: 'team', label: 'Team', icon: <GroupIcon className="w-4 h-4" /> },
              { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card.Content>
      </Card>

      {/* Tab Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title={isAdmin ? "Total Tasks" : "My Tasks"}
                  value={isAdmin ? totalTasks : myTasks.length}
                  subtitle={isAdmin ? "All tasks" : "Assigned to me"}
                  icon={<AssignmentIcon className="w-6 h-6" />}
                  color="bg-blue-50 text-blue-600"
                />
                <StatCard
                  title={isAdmin ? "Completed" : "My Completed"}
                  value={isAdmin ? completedTasks : myCompletedTasks}
                  subtitle={isAdmin ? "Done tasks" : "My done tasks"}
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                  color="bg-green-50 text-green-600"
                />
                <StatCard
                  title="Team Size"
                  value={activeTeamMembers.length}
                  subtitle="Members"
                  icon={<PeopleIcon className="w-6 h-6" />}
                  color="bg-purple-50 text-purple-600"
                />
                <StatCard
                  title={isAdmin ? "Progress" : "My Progress"}
                  value={`${isAdmin ? progressPercentage : myProgressPercentage}%`}
                  subtitle={isAdmin ? "Overall" : "Personal"}
                  icon={<TrendingUpIcon className="w-6 h-6" />}
                  color="bg-orange-50 text-orange-600"
                />
              </div>

              {/* Project Description */}
              <Card>
                <Card.Header className="border-b border-gray-200 pb-4">
                  <Card.Title className="text-lg font-semibold text-gray-900 flex items-center">
                    <DescriptionIcon className="w-5 h-5 mr-2 text-primary-600" />
                    Project Description
                  </Card.Title>
                </Card.Header>
                <Card.Content className="pt-6">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </Card.Content>
              </Card>

              {/* Timeline Overview */}
              <Card>
                <Card.Header className="border-b border-gray-200 pb-4">
                  <Card.Title className="text-lg font-semibold text-gray-900 flex items-center">
                    <CalendarTodayIcon className="w-5 h-5 mr-2 text-primary-600" />
                    Timeline
                  </Card.Title>
                </Card.Header>
                <Card.Content className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Start Date</label>
                      <p className="text-gray-900 font-semibold">
                        {new Date(project.startDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">End Date</label>
                      <p className="text-gray-900 font-semibold">
                        {new Date(project.endDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  {daysRemaining <= 7 && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      daysRemaining < 0 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        daysRemaining < 0 ? 'text-red-800' : 'text-orange-800'
                      }`}>
                        {daysRemaining < 0 
                          ? `Project is ${Math.abs(daysRemaining)} days overdue` 
                          : `Only ${daysRemaining} days remaining until deadline`
                        }
                      </p>
                    </div>
                  )}
                </Card.Content>
              </Card>
            </>
          )}

          {activeTab === 'tasks' && (
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <Card.Title className="text-lg font-semibold text-gray-900">
                    {isAdmin ? `Project Tasks (${tasks.length})` : `My Tasks (${myTasks.length})`}
                  </Card.Title>
                  {isAdmin && (
                    <Button
                      as={Link}
                      to={`/tasks/create?project=${project._id}`}
                      size="sm"
                    >
                      <AddIcon className="w-4 h-4 mr-2" />
                      New Task
                    </Button>
                  )}
                </div>
              </Card.Header>
              <Card.Content className="pt-6">
                {(isAdmin ? tasks : myTasks).length > 0 ? (
                  <div className="space-y-3">
                    {(isAdmin ? tasks : myTasks).map(task => (
                      <TaskItem 
                        key={task._id} 
                        task={task} 
                        isAssignedToCurrentUser={isTaskAssignedToMe(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TaskIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {isAdmin ? 'No tasks yet' : 'No tasks assigned to you'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {isAdmin 
                        ? 'Get started by creating the first task for this project.'
                        : 'You have not been assigned any tasks for this project yet.'
                      }
                    </p>
                    {isAdmin && (
                      <Button as={Link} to={`/tasks/create?project=${project._id}`}>
                        <AddIcon className="w-4 h-4 mr-2" />
                        Create First Task
                      </Button>
                    )}
                  </div>
                )}
              </Card.Content>
            </Card>
          )}

          {activeTab === 'team' && (
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  Team Members ({activeTeamMembers.length})
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6">
                {activeTeamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTeamMembers.map(employee => (
                      <TeamMemberCard 
                        key={employee._id} 
                        employee={employee} 
                        isCurrentUser={isEmployeeInTeam(employee)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GroupIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team members</h3>
                    <p className="text-gray-500">No employees have been assigned to this project yet.</p>
                  </div>
                )}
              </Card.Content>
            </Card>
          )}

          {activeTab === 'analytics' && (
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Project Analytics' : 'Project Overview'}
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">
                      {isAdmin ? 'Task Distribution' : 'Task Status'}
                    </h4>
                    {[
                      { status: 'todo', label: 'To Do', color: 'bg-gray-500', count: getTasksByStatus('todo').length },
                      { status: 'in-progress', label: 'In Progress', color: 'bg-blue-500', count: getTasksByStatus('in-progress').length },
                      { status: 'review', label: 'Review', color: 'bg-orange-500', count: getTasksByStatus('review').length },
                      { status: 'done', label: 'Done', color: 'bg-green-500', count: getTasksByStatus('done').length }
                    ].map(item => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Project Health</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Timeline</span>
                        <span className={daysRemaining < 7 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-semibold text-gray-900">{progressPercentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Team Engagement</span>
                        <span className="font-semibold text-gray-900">
                          {activeTeamMembers.length} members
                        </span>
                      </div>
                      {!isAdmin && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Your Contribution</span>
                          <span className="font-semibold text-gray-900">
                            {myTasks.length} tasks
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info Card */}
          <Card>
            <Card.Header className="border-b border-gray-200 pb-4">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Project Information
              </Card.Title>
            </Card.Header>
            <Card.Content className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Project ID</label>
                <p className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">
                  {project.projectId}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 w-fit ${statusConfig.color}`}>
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Created By</label>
                <p className="text-gray-900">{project.createdBy?.name || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Created Date</label>
                <p className="text-gray-900">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Card.Content>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <Card.Header className="border-b border-gray-200 pb-4">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Quick Actions
              </Card.Title>
            </Card.Header>
            <Card.Content className="pt-6 space-y-3">
              <Button
                as={Link}
                to={`/projects/board?project=${project._id}`}
                variant="outline"
                className="w-full justify-center"
              >
                <ViewKanbanIcon className="w-4 h-4 mr-2" />
                View Task Board
              </Button>
              {isAdmin && (
                <>
                  <Button
                    as={Link}
                    to={`/tasks/create?project=${project._id}`}
                    className="w-full justify-center"
                  >
                    <AddIcon className="w-4 h-4 mr-2" />
                    Add New Task
                  </Button>
                  <Button
                    as={Link}
                    to={`/projects/edit/${project._id}`}
                    variant="outline"
                    className="w-full justify-center"
                  >
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit Project
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>

          {/* My Tasks Summary - Only for employees */}
          {!isAdmin && myTasks.length > 0 && (
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  My Tasks Summary
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6">
                <div className="space-y-3">
                  {[
                    { status: 'todo', label: 'To Do', count: myTasks.filter(t => t.status === 'todo').length },
                    { status: 'in-progress', label: 'In Progress', count: myTasks.filter(t => t.status === 'in-progress').length },
                    { status: 'review', label: 'In Review', count: myTasks.filter(t => t.status === 'review').length },
                    { status: 'done', label: 'Completed', count: myTasks.filter(t => t.status === 'done').length }
                  ].map(item => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;