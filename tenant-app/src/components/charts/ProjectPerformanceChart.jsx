import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const ProjectPerformanceChart = ({ data }) => {
  // (kanban removed) we'll render a concise projects list below

  if (!data || !data.projectPerformance || data.projectPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <p>No project data available</p>
        </div>
      </div>
    );
  }

  const { projectPerformance, avgCompletionRate } = data;

  // Compute performance summary client-side in case API doesn't provide deadline-aware counts.
  // Rules:
  // - If project is completed -> counted in `completed`.
  // - If not completed and past due date -> `atRisk`.
  // - If not completed and due within WARNING_DAYS -> `warning` (needs attention).
  // - Otherwise -> `good` (on track).
  const WARNING_DAYS = 7;

  const isProjectCompleted = (proj) => {
    const s = String(proj.status || proj.state || proj.stage || '').toLowerCase();
    if (!s) {
      const cr = toNumberSafe(proj.completionRate ?? proj.completion ?? 0);
      return cr >= 100;
    }
    return s.includes('complete') || s.includes('done');
  };

  const parseDueDate = (proj) => {
    const candidates = [proj.dueDate, proj.endDate, proj.deadline, proj.dueAt, proj.due_at];
    for (const c of candidates) {
      if (!c) continue;
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const computePerformanceSummary = (projects = []) => {
    const out = { good: 0, warning: 0, critical: 0, completed: 0 };
    const now = Date.now();
    for (const p of projects) {
      try {
        if (isProjectCompleted(p)) {
          out.completed += 1;
          continue;
        }
        const due = parseDueDate(p);
        if (!due) {
          // No due date: treat as on-track by default
          out.good += 1;
          continue;
        }
        const diffMs = due.getTime() - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          out.critical += 1; // past due -> at risk
        } else if (diffDays <= WARNING_DAYS) {
          out.warning += 1; // near due -> needs attention
        } else {
          out.good += 1; // on track
        }
      } catch {
        out.good += 1;
      }
    }
    return out;
  };

  const performanceSummaryComputed = computePerformanceSummary(projectPerformance);

  // (charts removed) prepare KPIs below

  // KPI calculations for compact progress cards
  const totalProjects = projectPerformance.length;
  const totalTasksAcross = projectPerformance.reduce((sum, p) => {
    const ts = p.taskStats || {};
    const todo = Number(ts.todo || 0);
    const inProgress = Number(ts['in-progress'] || ts.inProgress || 0);
    const review = Number(ts.review || 0);
    const done = Number(ts.done || 0);
    return sum + todo + inProgress + review + done;
  }, 0);
  const avgTasksPerProject = totalProjects > 0 ? Math.round((totalTasksAcross / totalProjects) * 10) / 10 : 0;
  const avgCompletion = projectPerformance.reduce((s, p) => s + (Number(p.completionRate || 0)), 0) / (totalProjects || 1);

  // Sparkline data (use recent project completion rates for a small trend)
  const sparklineData = projectPerformance.slice(0, 8).map(p => ({ name: p.name, value: Number(p.completionRate || 0) }));

  // Helper: safely parse numbers coming from API (strings, nulls, etc.)
  const toNumberSafe = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  // Small formatting helpers
  const fmtNumber = (n) => {
    if (n === null || n === undefined) return '0';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const fmtRelativeDate = (iso) => {
    try {
      if (!iso) return '';
      const diff = Date.now() - new Date(iso).getTime();
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const days = Math.floor(hr / 24);
      if (days < 30) return `${days}d ago`;
      return new Date(iso).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const statusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = String(status).toLowerCase();
    if (s.includes('done') || s.includes('complete')) return 'bg-green-100 text-green-800';
    if (s.includes('progress') || s.includes('in-progress')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('review')) return 'bg-violet-100 text-violet-800';
    if (s.includes('risk') || s.includes('at risk') || s.includes('blocked')) return 'bg-red-100 text-red-800';
    return 'bg-blue-50 text-blue-800';
  };

  const initials = (name) => {
    if (!name) return '?';
    const parts = String(name).split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  };

  

  // Simple tooltip showing counts and percentages (easy to read)
  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // payload order: stacked bars (todo,inProgress,review,done) followed by any other items
      const bars = payload.filter(p => ['todo', 'inProgress', 'review', 'done', 'totalTasks'].includes(p.dataKey));
      const total = bars.reduce((s, p) => s + (Number(p.value) || 0), 0);

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
          <div className="font-semibold text-gray-900 mb-1">{label}</div>
          {bars.map(b => {
            const pct = total > 0 ? ((Number(b.value) / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={b.dataKey} className="flex justify-between">
                <div className="text-gray-700">{b.name || b.dataKey}</div>
                <div className="font-semibold text-gray-900">{b.value} ({pct}%)</div>
              </div>
            );
          })}
          <div className="mt-2 text-xs text-gray-500">Total tasks: {total}</div>
        </div>
      );
    }
    return null;
  };

  // Pie tooltip remains simple
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            Projects: <strong>{payload[0].value}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Projects Overview</h2>
          <p className="text-sm text-gray-500">A concise view of project progress, tasks and team distribution.</p>
        </div>
        <div className="text-sm text-gray-500">Last updated: <span className="font-medium text-gray-700">{fmtRelativeDate(projectPerformance[0]?.updatedAt)}</span></div>
      </div>
      {/* KPI / Progress Cards (compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-3 border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Avg Completion</p>
              <div className="text-2xl font-extrabold text-gray-900 tracking-tight">{avgCompletion ? avgCompletion.toFixed(1) : 0}%</div>
            </div>
            <div className="w-28 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">Total Tasks</p>
          <div className="text-xl font-bold text-gray-900">{totalTasksAcross}</div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">Avg Tasks / Project</p>
          <div className="text-xl font-bold text-gray-900">{avgTasksPerProject}</div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">Projects</p>
          <div className="text-xl font-bold text-gray-900">{totalProjects}</div>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-white rounded-lg border border-green-100 shadow-sm">
          <div className="text-2xl font-semibold text-green-600">{performanceSummaryComputed.good}</div>
          <div className="text-sm text-gray-500">On Track</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border border-yellow-100 shadow-sm">
          <div className="text-2xl font-semibold text-yellow-600">{performanceSummaryComputed.warning}</div>
          <div className="text-sm text-gray-500">Needs Attention</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border border-red-100 shadow-sm">
          <div className="text-2xl font-semibold text-red-600">{performanceSummaryComputed.critical}</div>
          <div className="text-sm text-gray-500">At Risk</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
          <div className="text-2xl font-semibold text-blue-600">{performanceSummaryComputed.completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
      </div>

      {/* Projects Overview List */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3">
          {projectPerformance.map((proj) => {
            const stats = proj.taskStats || {};
            const todoRaw = stats.todo ?? stats['to-do'] ?? stats.toDo ?? stats.todoCount ?? proj.todo ?? 0;
            const inProgressRaw = stats['in-progress'] ?? stats.inProgress ?? stats.inprogress ?? stats.inProg ?? 0;
            const reviewRaw = stats.review ?? stats.reviews ?? 0;
            const doneRaw = stats.done ?? stats.completed ?? 0;

            let todo = toNumberSafe(todoRaw);
            let inProgress = toNumberSafe(inProgressRaw);
            let review = toNumberSafe(reviewRaw);
            let done = toNumberSafe(doneRaw);

            const statsSum = todo + inProgress + review + done;
            const declaredTotal = toNumberSafe(proj.totalTasks ?? proj.total ?? 0);

            let total = statsSum;
            // If API declares a totalTasks and it's > 0, prefer it (but keep breakdown). If breakdown sums to more than declared total, scale breakdown down proportionally.
            if (declaredTotal > 0) {
              total = declaredTotal;
              if (statsSum > declaredTotal && statsSum > 0) {
                const scale = declaredTotal / statsSum;
                let sTodo = Math.round(todo * scale);
                let sInProg = Math.round(inProgress * scale);
                let sReview = Math.round(review * scale);
                let sDone = Math.round(done * scale);
                // Fix rounding differences by adjusting the largest bucket
                let adjustedSum = sTodo + sInProg + sReview + sDone;
                const diff = declaredTotal - adjustedSum;
                if (diff !== 0) {
                  // find the bucket with the largest raw value to absorb the diff
                  const buckets = [{k: 'todo', v: todo}, {k: 'inProgress', v: inProgress}, {k: 'review', v: review}, {k: 'done', v: done}];
                  buckets.sort((a,b) => b.v - a.v);
                  const largest = buckets[0].k;
                  if (largest === 'todo') sTodo += diff;
                  else if (largest === 'inProgress') sInProg += diff;
                  else if (largest === 'review') sReview += diff;
                  else sDone += diff;
                }
                todo = sTodo; inProgress = sInProg; review = sReview; done = sDone;
              }
            } else {
              total = statsSum;
            }

            const assigned = proj.assignedEmployees || proj.teamMembers || [];
            const assignedCount = Array.isArray(assigned) ? assigned.length : (toNumberSafe(assigned) || 0);
            const completionVal = toNumberSafe(proj.completionRate ?? proj.completion ?? (total > 0 ? Math.round((done / total) * 100) : 0));
            const progressPct = Math.min(100, Math.max(0, completionVal));

            return (
              <div
                key={proj.projectId || proj._id || proj.id || proj.name}
                role="listitem"
                tabIndex={0}
                className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{proj.name}</h3>
                    <p className="text-sm text-gray-500 truncate mt-1">{proj.description || proj.summary || ''}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{progressPct}%</span>
                        <span className="text-gray-800 dark:text-gray-100">Completion</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{fmtNumber(total)}</span>
                        <span className="text-gray-800 dark:text-gray-100">Tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{fmtNumber(assignedCount)}</span>
                        <span className="text-gray-800 dark:text-gray-100">Team Size</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(proj.status || (proj.completionRate >= 100 ? 'Completed' : 'Active'))}`}>
                        {proj.status || (proj.completionRate >= 100 ? 'Completed' : 'Active')}
                      </div>
                    </div>
                    <div className="text-xs text-gray-100">Updated: {fmtRelativeDate(proj.updatedAt)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full bg-gray-100 h-2 rounded overflow-hidden" aria-hidden>
                    <div className="h-2 bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full">To Do: {todo}</span>
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full">In Progress: {inProgress}</span>
                      <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full">Review: {review}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">Done: {done}</span>
                      <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded-full">Total: {total}</span>
                    </div>
                    <div className="text-xs text-indigo-700 font-semibold">{progressPct}%</div>
                  </div>
                </div>

                {Array.isArray(assigned) && assigned.length > 0 && (
                  <div className="mt-3 flex items-center gap-2" aria-label={`Team members, ${assignedCount} total`}>
                    {assigned.slice(0, 6).map((m, i) => (
                      <div key={i} title={m.name || m} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-800 ring-1 ring-white shadow-sm" aria-hidden>
                        {initials(m.name || m)}
                      </div>
                    ))}
                    {assigned.length > 6 && <div className="text-xs text-gray-500">+{assigned.length - 6} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Completion Rate */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-purple-900">Overall Performance</h4>
            <p className="text-sm text-purple-700">Average Project Completion Rate</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{avgCompletionRate}%</div>
            <div className="text-sm text-purple-500">
              {avgCompletionRate >= 80 ? 'Excellent' : avgCompletionRate >= 60 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPerformanceChart;