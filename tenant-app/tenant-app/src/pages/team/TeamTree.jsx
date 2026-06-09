import React from 'react';
import Button from '../../components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TeamTree = ({ team, onRemove, onAssign, depth = 0, isAdmin = false, draggedEmployee }) => {
  const handleRemove = () => {
    if (onRemove && team.teamLead && team.teamLead._id && team._id) {
      onRemove(team.teamLead._id, team._id);
    } else {
      console.warn('Invalid remove params:', { teamLead: team.teamLead?._id, member: team._id });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => { 
    e.preventDefault();
    e.stopPropagation(); 
    if (onAssign && draggedEmployee && draggedEmployee._id !== team._id) { 
      onAssign(e, team._id); 
    }
  };

  const dropZoneClass = `transition-all duration-200 ${draggedEmployee ? 'border-2 border-dashed border-blue-400 bg-blue-50/80 shadow-lg ring-2 ring-blue-200/50' : 'border-transparent'
    }`;

  return (
    <div
      className={`mb-6 p-4 rounded-xl border-l-4 ${dropZoneClass} ${depth === 0
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-lg'
          : depth === 1
            ? 'bg-emerald-50 border-emerald-400 ml-6'
            : 'bg-indigo-50 border-indigo-400 ml-12'
        }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md mt-1">
            <span className="text-lg font-bold text-white">
              {team.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-lg truncate">
              {team.name}
            </h3>
            <p className="text-sm text-gray-600 font-medium">{team.position}</p>
            <p className="text-xs text-gray-500">{team.department}</p>
            {team.email && (
              <p className="text-xs text-gray-400 mt-1 truncate">{team.email}</p>
            )}
          </div>
        </div>
        {isAdmin && depth > 0 && onRemove && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 -ml-2 p-1.5"
            title="Remove from team"
          >
            <XMarkIcon className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Team Members Drop Zone */}
      {isAdmin && (
        <div className={`p-4 mb-4 rounded-lg border-2 border-dashed ${dropZoneClass} bg-gray-50/50 min-h-[40px] transition-all hover:border-green-400`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p className={`text-xs text-gray-500 text-center ${draggedEmployee ? 'text-green-600 font-medium' : ''}`}>
            Drop employee here to add as team member
          </p>
        </div>
      )}

      {/* Team Members */}
      {team.teamMembers && team.teamMembers.length > 0 && (
        <div className="ml-12 space-y-4 border-l border-gray-200 pl-4 pb-4">
          {team.teamMembers.map((member) => (
            <TeamTree
              key={member._id}
              team={member}
              onRemove={onRemove}
              onAssign={onAssign}
              depth={depth + 1}
              isAdmin={isAdmin}
              draggedEmployee={draggedEmployee}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamTree;

