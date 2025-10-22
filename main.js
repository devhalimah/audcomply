// main.js - AudComply Logic
const STORAGE_KEY = 'audcomply_audits';
let currentAudit = null;
let audits = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// DOM Elements
const createBtn = document.getElementById('create-audit');
const viewBtn = document.getElementById('view-saved');
const exportBtn = document.getElementById('export-json');
const clearBtn = document.getElementById('clear-all');
const activeSection = document.getElementById('active-audit');
const auditTitle = document.getElementById('audit-title');
const saveBtn = document.getElementById('save-audit');
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const reminders = document.getElementById('reminders');
const reminderList = document.getElementById('reminder-list');
const modal = document.getElementById('saved-modal');
const savedList = document.getElementById('saved-list');
const closeModal = document.getElementById('close-modal');

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Create New Audit
createBtn.addEventListener('click', () => {
  currentAudit = {
    id: Date.now(),
    title: 'New Audit',
    tasks: [],
    createdAt: new Date().toISOString()
  };
  loadAudit(currentAudit);
  toggleActiveSection(true);
});

// View Saved Audits
viewBtn.addEventListener('click', () => {
  renderSavedAudits();
  modal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// Load Audit into UI
function loadAudit(audit) {
  currentAudit = audit;
  auditTitle.value = audit.title;
  renderTasks();
  updateProgress();
  checkReminders();
  toggleButtons(true);
}

// Render Tasks
function renderTasks() {
  taskList.innerHTML = '';
  currentAudit.tasks.forEach((task, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
      <td class="px-4 py-3">
        <input type="text" value="${escapeHtml(task.name)}" data-index="${index}" data-field="name" class="task-input border rounded px-2 py-1 w-full">
      </td>
      <td class="px-4 py-3">
        <input type="text" value="${escapeHtml(task.assignee)}" data-index="${index}" data-field="assignee" class="task-input border rounded px-2 py-1 w-full">
      </td>
      <td class="px-4 py-3">
        <input type="date" value="${task.dueDate}" data-index="${index}" data-field="dueDate" class="task-input border rounded px-2 py-1">
      </td>
      <td class="px-4 py-3">
        <select data-index="${index}" data-field="status" class="task-input border rounded px-2 py-1">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
      <td class="px-4 py-3">
        ${task.evidence ? `<a href="${task.evidence}" target="_blank" class="text-indigo-600 hover:underline text-sm">View</a>` : 
          `<input type="url" placeholder="https://..." value="" data-index="${index}" data-field="evidence" class="task-input border rounded px-2 py-1 w-full text-sm">`}
      </td>
      <td class="px-4 py-3 text-center">
        <button class="text-red-600 hover:text-red-800 text-sm delete-task" data-index="${index}">Delete</button>
      </td>
    `;
    taskList.appendChild(tr);
  });

  // Attach input listeners
  document.querySelectorAll('.task-input').forEach(input => {
    input.addEventListener('change', handleTaskUpdate);
  });
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', deleteTask);
  });
}

// Handle Task Field Updates
function handleTaskUpdate(e) {
  const index = e.target.dataset.index;
  const field = e.target.dataset.field;
  let value = e.target.value;

  if (field === 'evidence' && value && !value.startsWith('http')) {
    value = 'https://' + value;
    e.target.value = value;
  }

  currentAudit.tasks[index][field] = value;
  updateProgress();
  checkReminders();
}

// Delete Task
function deleteTask(e) {
  const index = parseInt(e.target.dataset.index);
  currentAudit.tasks.splice(index, 1);
  renderTasks();
  updateProgress();
  checkReminders();
}

// Add New Task
addTaskBtn.addEventListener('click', () => {
  currentAudit.tasks.push({
    name: 'New Task',
    assignee: '',
    dueDate: '',
    status: 'Pending',
    evidence: ''
  });
  renderTasks();
  updateProgress();
});

// Update Progress Bar
function updateProgress() {
  const completed = currentAudit.tasks.filter(t => t.status === 'Completed').length;
  const total = currentAudit.tasks.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// Save Audit
saveBtn.addEventListener('click', () => {
  currentAudit.title = auditTitle.value.trim() || 'Untitled Audit';
  const existing = audits.find(a => a.id === currentAudit.id);
  if (existing) {
    Object.assign(existing, currentAudit);
  } else {
    audits.push(currentAudit);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
  alert('Audit saved!');
  checkReminders();
});

// Export JSON
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(audits, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audcomply-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Clear All
clearBtn.addEventListener('click', () => {
  if (confirm('Delete all audits? This cannot be undone.')) {
    audits = [];
    localStorage.removeItem(STORAGE_KEY);
    toggleActiveSection(false);
    toggleButtons(false);
    reminders.classList.add('hidden');
  }
});

// Render Saved Audits in Modal
function renderSavedAudits() {
  savedList.innerHTML = '';
  if (audits.length === 0) {
    savedList.innerHTML = '<p class="text-gray-500">No saved audits.</p>';
    return;
  }
  audits.forEach(audit => {
    const div = document.createElement('div');
    div.className = 'p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center';
    div.innerHTML = `
      <div>
        <h4 class="font-medium">${escapeHtml(audit.title)}</h4>
        <p class="text-xs text-gray-500">${new Date(audit.createdAt).toLocaleDateString()} – ${audit.tasks.length} tasks</p>
      </div>
      <button class="text-indigo-600 text-sm load-audit" data-id="${audit.id}">Load</button>
    `;
    div.querySelector('.load-audit').addEventListener('click', () => {
      const toLoad = audits.find(a => a.id == audit.id);
      loadAudit(toLoad);
      modal.classList.add('hidden');
    });
    savedList.appendChild(div);
  });
}

// Check for upcoming tasks and send notifications
function checkReminders() {
  reminderList.innerHTML = '';
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  let hasReminder = false;

  audits.forEach(audit => {
    audit.tasks.forEach(task => {
      if (task.dueDate && task.status !== 'Completed') {
        const due = new Date(task.dueDate);
        if (due >= now && due < tomorrow) {
          hasReminder = true;
          const li = document.createElement('li');
          li.textContent = `${audit.title}: "${task.name}" due tomorrow`;
          reminderList.appendChild(li);

          // Send notification
          if (Notification.permission === 'granted') {
            new Notification('AudComply Reminder', {
              body: `"${task.name}" in "${audit.title}" is due tomorrow!`,
              icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>'
            });
          }
        }
      }
    });
  });

  reminders.classList.toggle('hidden', !hasReminder);
}

// Toggle visibility, visibility
function toggleActiveSection(show) {
  activeSection.classList.toggle('hidden', !show);
}

function toggleButtons(show) {
  exportBtn.classList.toggle('hidden', !show || audits.length === 0);
  clearBtn.classList.toggle('hidden', !show || audits.length === 0);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-load last audit if exists
if (audits.length > 0) {
  toggleButtons(true);
  checkReminders();
}