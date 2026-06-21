import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { projectService } from '../../services/projects';
import { useAuth } from '../../context/AuthContext';

// Material-UI Icons
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';

const getActiveMembers = (employees) => {
  if (!Array.isArray(employees)) return [];
  return employees.filter(member => member?.isActive !== false);
};

const ProjectCard = ({ project, viewMode = 'grid' }) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      'on-hold': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const activeMembers = useMemo(
    () => getActiveMembers(project.assignedEmployees),
    [project.assignedEmployees]
  );

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-all duration-300">
        <Card.Content className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="p-2 bg-primary-50 rounded-lg">
                <FolderIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.projectId}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {project.description}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-12 sm:pl-0">
              <div className="text-center">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="font-semibold text-gray-900">{project.progress}%</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">Team</div>
                <div className="font-semibold text-gray-900">{activeMembers.length}</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">Due Date</div>
                <div className="font-semibold text-gray-900">
                  {new Date(project.endDate).toLocaleDateString()}
                </div>
              </div>
              
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                {project.status.replace('-', ' ')}
              </span>
              
              <Button
                as={Link}
                to={`/projects/${project._id}`}
                variant="outline"
                size="sm"
              >
                View
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  // Grid View (default)
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary-100">
      <Card.Content className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <FolderIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500">{project.projectId}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-gray-900">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(project.progress)}`}
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <PeopleIcon className="w-4 h-4" />
            <span>{activeMembers.length} members</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CalendarTodayIcon className="w-4 h-4" />
            <span>{new Date(project.endDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
            {project.status.replace('-', ' ')}
          </span>
          <div className="flex space-x-2">
            <Button
              as={Link}
              to={`/projects/${project._id}`}
              variant="outline"
              size="sm"
            >
              View Details
            </Button>
            <Button
              as={Link}
              to={`/projects/board?project=${project._id}`}
              variant="outline"
              size="sm"
            >
              Task Board
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

const ProjectsListPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadProjects();
  }, [filters]);

  // Client-side search filtering (backend currently doesn't apply `search` query)
  const filteredProjects = useMemo(() => {
    const term = (filters.search || '').trim().toLowerCase();
    if (!term) return projects;

    const matches = (project) => {
      if (!project) return false;
      if (project.name && project.name.toLowerCase().includes(term)) return true;
      if (project.description && project.description.toLowerCase().includes(term)) return true;
      if (project.projectId && project.projectId.toLowerCase().includes(term)) return true;
      const activeMembers = getActiveMembers(project.assignedEmployees);
      if (activeMembers.some(e => (e.name || '').toLowerCase().includes(term))) return true;
      if (project.createdBy && ((project.createdBy.name || '').toLowerCase().includes(term))) return true;
      return false;
    };

    return projects.filter(matches);
  }, [projects, filters.search]);

  const loadProjects = async () => {
    try {
      // For employees, we don't need to pass any special filter
      // The backend should automatically filter to only assigned projects
      const response = await projectService.getProjects(filters);
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ 
      ...prev, 
      status: status === prev.status ? '' : status 
    }));
  };

  const getPageTitle = () => {
    return isAdmin ? 'Projects' : 'My Projects';
  };

  const getPageDescription = () => {
    return isAdmin 
      ? 'Manage and track all your projects in one place'
      : 'View and manage projects assigned to you';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-600 mt-2">
            {getPageDescription()}
          </p>
        </div>
        
        {/* Only show Create Project button for admins */}
        {isAdmin && (
          <Button
            as={Link}
            to="/projects/create"
            className="whitespace-nowrap"
          >
            <AddIcon className="w-4 h-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters and Controls - Only show filters if there are projects */}
      {(projects.length > 0 || filters.status || filters.search) && (
        <Card>
          <Card.Content className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${isAdmin ? 'projects' : 'my projects'}...`}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* View Controls */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Status Filters */}
                <div className="flex items-center space-x-2">
                  <FilterListIcon className="w-4 h-4 text-gray-400" />
                  {['active', 'completed', 'on-hold'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilter(status)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        filters.status === status
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white text-primary-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ViewModuleIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white text-primary-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ViewListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Projects Grid/List */}
      {filteredProjects.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredProjects.map(project => (
            <ProjectCard 
              key={project._id} 
              project={project}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Card.Content className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isAdmin ? 'No projects found' : 'No projects assigned'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filters.status || filters.search 
                ? 'Try adjusting your filters to see more results.' 
                : isAdmin 
                  ? 'Get started by creating your first project.'
                  : 'You have not been assigned to any projects yet.'
              }
            </p>
            {!filters.status && !filters.search && isAdmin && (
              <Button as={Link} to="/projects/create">
                <AddIcon className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default ProjectsListPage;