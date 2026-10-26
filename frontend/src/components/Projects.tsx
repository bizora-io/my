import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { FolderGit2, Plus, RefreshCw, CheckCircle2, Clock, AlertCircle, Calendar, User, DollarSign } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  assigneeName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  clientName?: string;
  budget: number;
  spent: number;
  startDate: string;
  deadline: string;
  progress: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  taskCount?: number;
  completedTaskCount?: number;
}

export const Projects: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const { employees } = useData();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Project form
  const [projName, setProjName] = useState('');
  const [clientName, setClientName] = useState('');
  const [budget, setBudget] = useState<number>(100000);
  const [deadline, setDeadline] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, tRes, oRes] = await Promise.all([
        authFetch('/api/projects'),
        authFetch('/api/projects/tasks'),
        authFetch('/api/projects/tasks/overdue'),
      ]);
      if (pRes.ok) setProjects(await pRes.json());
      if (tRes.ok) setTasks(await tRes.json());
      if (oRes.ok) setOverdueTasks(await oRes.json());
    } catch (e) {
      console.warn('Failed to load projects', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName) return;
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          clientName,
          budget,
          deadline,
        }),
      });
      if (res.ok) {
        setShowProjectModal(false);
        setProjName('');
        setClientName('');
        loadData();
      }
    } catch (e) {
      console.warn('Create project failed', e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !selectedProjectId) return;
    try {
      const res = await authFetch('/api/projects/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: taskTitle,
          assigneeName: taskAssignee,
          priority: taskPriority,
          dueDate: taskDueDate,
        }),
      });
      if (res.ok) {
        setShowTaskModal(false);
        setTaskTitle('');
        loadData();
      }
    } catch (e) {
      console.warn('Create task failed', e);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await authFetch(`/api/projects/tasks/${taskId}/complete`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Complete task failed', e);
    }
  };

  const displayedTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('Project & Task Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Track client deliverables, milestone budgets, task assignees, and real-time progress percentages.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowProjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('New Project')}
          </button>
        </div>
      </div>

      {/* Overdue alert banner if any */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>
            <strong>{overdueTasks.length} {t('tasks are overdue')}</strong> across projects. Please review deadlines.
          </span>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => setSelectedProjectId(selectedProjectId === proj.id ? null : proj.id)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedProjectId === proj.id
                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {proj.code}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                  {proj.name}
                </h3>
                <span className="text-xs text-slate-500">{proj.clientName || 'Internal Project'}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  proj.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {proj.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">{t('Progress')}</span>
                <span className="text-indigo-600 dark:text-indigo-400">{proj.progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${proj.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {proj.completedTaskCount || 0} / {proj.taskCount || 0} {t('tasks done')}
              </span>
              <span className="font-bold text-slate-800 dark:text-white">
                {formatCurrency(proj.budget)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tasks Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedProjectId
                ? `${t('Tasks for')} ${projects.find((p) => p.id === selectedProjectId)?.name}`
                : t('All Project Tasks')}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {displayedTasks.length}
            </span>
          </div>
          {selectedProjectId && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('Add Task')}
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('No tasks found. Select a project to add one.')}
            </div>
          ) : (
            displayedTasks.map((tk) => (
              <div key={tk.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => tk.status !== 'DONE' && handleCompleteTask(tk.id)}
                    className={`p-1 rounded-full ${
                      tk.status === 'DONE'
                        ? 'text-emerald-600'
                        : 'text-slate-300 hover:text-emerald-500'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div>
                    <span
                      className={`font-semibold text-sm ${
                        tk.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {tk.title}
                    </span>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{tk.assigneeName || 'Unassigned'}</span>
                      {tk.dueDate && <span>• Due {tk.dueDate}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      tk.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-700'
                        : tk.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tk.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('Create New Project')}</h2>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Project Name')} *</label>
                <input
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. Website Redesign Q4"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Client Name')}</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme International"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Budget (Tk)')}</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Target Deadline')}</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowProjectModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
                  {t('Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('Add Task to Project')}</h2>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Task Title')} *</label>
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Design homepage hero banner"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Assignee')}</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">{t('Select staff...')}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Priority')}</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Due Date')}</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
                  {t('Add Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;

