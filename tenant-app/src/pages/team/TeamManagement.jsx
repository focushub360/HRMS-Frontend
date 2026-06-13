import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeService } from '../../services/employees';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TeamTree from './TeamTree';
import { toast } from '../../utils/toast';
import { UserGroupIcon, UserPlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const TeamManagement = () => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState(null);
  const [draggedEmployee, setDraggedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadTeams();
    loadAvailableEmployees();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getTeamStructure();
      setTeamData(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError('Failed to load team structure');
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await employeeService.getEmployeesForAssignment();
      const unassigned = data.data.filter(emp => !emp.teamLead && emp.isActive);
      setEmployees(unassigned);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const refreshAll = useCallback(() => {
    loadTeams();
    loadAvailableEmployees();
  }, []);

  const handleRemove = async (teamLeadId, memberId) => {
    if (!teamLeadId || !memberId) {
      toast.error('Invalid team lead or member ID');
      return;
    }
    if (!confirm('Remove this member from the team?')) return;
    try {
      await employeeService.removeTeamMember(teamLeadId, memberId);
      toast.success('Member removed');
      refreshAll();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const handleDragStart = (e, employee) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id: employee._id }));
  };

  const handleDrop = async (e, targetId, isCreateLead = false) => {
    e.preventDefault();
    // console.log('Drop fired:', {targetId, dragged: draggedEmployee?._id});
    if (!draggedEmployee || draggedEmployee._id === targetId) return;

    try {
      if (isCreateLead) {
        toast.info('Set employee role to "team-lead" via Employees page first');
        return;
      } else {
        await employeeService.assignTeamMember(targetId, draggedEmployee._id);
        toast.success('Employee assigned to team');
        refreshAll();
      }
    } catch (err) {
      console.error('Assign error:', err);
      toast.error('Failed to assign employee');
    }
    setDraggedEmployee(null);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading team structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Team Hierarchy
          </h1>
          <p className="text-xl text-gray-600">
            {isAdmin ? 'Drag employees from right sidebar to build teams' : 'Your team structure'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={refreshAll} variant="outline">
            Refresh
          </Button>
          {isAdmin && (
            <Button href="/employees/add">
              + Add Employee
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="mb-8 p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-900">Load Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="h-[70vh] overflow-hidden">
            <div className="p-8 overflow-y-auto h-full">
              {isAdmin && (
                <div 
                  className="mb-6 p-8  border-2 border-dashed border-gray-300 rounded-xl text-center transition-all  hover:border-blue-400 bg-blue-50/50 cursor-pointer min-h-[100px] flex flex-col items-center justify-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, null, true)}
                >
                  <UserPlusIcon className="w-12 h-12 text-gray-800 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Drop to Create Team Lead</h3>
                  <p className="text-sm text-gray-500">(set role=team-lead first)</p>
                </div>
              )}

              {teamData.length > 0 ? (
                <div className="space-y-6">
                  {teamData.map((team) => (
                    <TeamTree 
                      key={team._id}
                      team={team} 
                      onRemove={handleRemove}
                      onAssign={handleDrop}
                      depth={0}
                      isAdmin={isAdmin}
                      draggedEmployee={draggedEmployee}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <UserGroupIcon className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Teams</h3>
                  <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
                    Drag from right sidebar to start building.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-8 h-[70vh] overflow-hidden">
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-gray-900 text-lg flex-1">
                  Available ({filteredEmployees.length})
                </h3>
                {isAdmin && selectedEmployees.length > 0 && (
                  <div className="flex gap-2">
                    <select 
                      value={selectedTeamLead || ''}
                      onChange={(e) => setSelectedTeamLead(e.target.value)}
                      className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
                      disabled={bulkLoading}
                    >
                      <option value="">Select Lead</option>
                      {teamData.map(lead => (
                        <option key={lead._id} value={lead._id}>
                          {lead.name} ({lead.teamMembers?.length || 0})
                        </option>
                      ))}
                    </select>
                    <Button 
                      size="sm" 
                      onClick={handleBulkAssign}
                      loading={bulkLoading}
                      disabled={!selectedTeamLead || bulkLoading}
                      className="px-3"
                    >
                      Assign {selectedEmployees.length}
                    </Button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Available ({filteredEmployees.length})
              </h3>
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="sm" />
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="space-y-3">
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp._id}
                      className="group p-3 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, emp)}
                      title={`Drag ${emp.name} to assign`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-sm">
                            {emp.name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <UserGroupIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">No available employees</p>
                  <Button href="/employees" variant="outline" size="sm" className="mt-4">
                    Manage Employees
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;

