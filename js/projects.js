// Projects Management Module

let allProjects = [];
let allWebmasters = [];
let currentProjectTasks = [];

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user) return;
    
    await loadWebmasters();
    setupProjectModal();
    setupFilters();
    setupTaskHandlers();
    await loadProjects();
});

// Load webmasters for dropdowns
async function loadWebmasters() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, name')
            .in('role', ['webmaster_level_1', 'webmaster_level_2'])
            .order('name');
        
        if (error) throw error;
        
        allWebmasters = data || [];
        populateWebmasterDropdowns();
        
    } catch (err) {
        console.error('Error loading webmasters:', err);
    }
}

// Populate webmaster dropdowns
function populateWebmasterDropdowns() {
    const filterSelect = document.getElementById('filterWebmaster');
    const formSelect = document.getElementById('assignedWebmaster');
    
    const options = allWebmasters.map(w => 
        `<option value="${w.id}">${escapeHtml(w.name)}</option>`
    ).join('');
    
    filterSelect.innerHTML = '<option value="">All Webmasters</option>' + options;
    formSelect.innerHTML = '<option value="">Select Webmaster</option>' + options;
}

// Setup filters
function setupFilters() {
    document.getElementById('filterStatus').addEventListener('change', filterProjects);
    document.getElementById('filterWebmaster').addEventListener('change', filterProjects);
    document.getElementById('searchProject').addEventListener('input', filterProjects);
}

// Filter projects
function filterProjects() {
    const statusFilter = document.getElementById('filterStatus').value;
    const webmasterFilter = document.getElementById('filterWebmaster').value;
    const searchTerm = document.getElementById('searchProject').value.toLowerCase().trim();
    
    let filtered = [...allProjects];
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            (p.project_name && p.project_name.toLowerCase().includes(searchTerm)) ||
            (p.live_site_link && p.live_site_link.toLowerCase().includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(p => {
            const projectStatus = p.project_status || '';
            return projectStatus.toLowerCase() === statusFilter.toLowerCase();
        });
    }
    
    if (webmasterFilter) {
        filtered = filtered.filter(p => p.assigned_webmaster == webmasterFilter);
    }
    
    renderProjectsGrid(filtered);
}

// Setup modal event handlers
function setupProjectModal() {
    const modal = document.getElementById('projectModal');
    const addBtn = document.getElementById('addProjectBtn');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelProjectBtn');
    const form = document.getElementById('projectForm');
    
    // Check if user can add projects (managers only or based on your logic)
    const user = getCurrentUser();
    if (user.role !== 'manager') {
        addBtn.style.display = 'none';
    }
    
    addBtn.addEventListener('click', () => openProjectModal());
    closeBtn.addEventListener('click', () => closeProjectModal());
    cancelBtn.addEventListener('click', () => closeProjectModal());
    form.addEventListener('submit', handleProjectSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeProjectModal();
    });
}

// Open project modal for add/edit
async function openProjectModal(project = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const form = document.getElementById('projectForm');
    const tasksSection = document.getElementById('tasksSection');
    
    form.reset();
    currentProjectTasks = [];
    
    if (project) {
        // Edit mode - show tasks section
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Project';
        document.getElementById('projectId').value = project.id;
        tasksSection.style.display = 'block';
        
        // Basic fields
        document.getElementById('projectName').value = project.project_name || '';
        document.getElementById('ticketLink').value = project.ticket_link || '';
        document.getElementById('liveSiteLink').value = project.live_site_link || '';
        
        // Set status - handle case-insensitive matching
        const statusSelect = document.getElementById('projectStatus');
        const projectStatus = project.project_status || 'WP conversion';
        
        // Find matching option
        let found = false;
        for (let option of statusSelect.options) {
            if (option.value.toLowerCase() === projectStatus.toLowerCase()) {
                statusSelect.value = option.value;
                found = true;
                break;
            }
        }
        if (!found) {
            statusSelect.value = 'WP conversion';
        }
        
        document.getElementById('assignedWebmaster').value = project.assigned_webmaster || '';
        
        // Date fields
        document.getElementById('designApprovedDate').value = project.design_approved_date || '';
        document.getElementById('webmasterAssignedDate').value = project.webmaster_assigned_date || '';
        document.getElementById('targetDate').value = project.target_date || '';
        document.getElementById('signedUpDate').value = project.signed_up_date || '';
        document.getElementById('contractStartDate').value = project.contract_start_date || '';
        document.getElementById('dnsChangedDate').value = project.dns_changed_date || '';
        
        // WP QA dates
        document.getElementById('dateSentToWpQa').value = project.date_sent_to_wp_qa || '';
        document.getElementById('dateFinishedWpQa').value = project.date_finished_wp_qa || '';
        document.getElementById('dateFinishedWpBugs').value = project.date_finished_wp_bugs || '';
        
        // Page QA dates
        document.getElementById('dateSentToPageQa').value = project.date_sent_to_page_qa || '';
        document.getElementById('dateFinishedPageQa').value = project.date_finished_page_qa || '';
        document.getElementById('dateFinishedPageBugs').value = project.date_finished_page_bugs || '';
        
        // Go Live QA dates
        document.getElementById('dateSentToGoliveQa').value = project.date_sent_to_golive_qa || '';
        document.getElementById('dateFinishedGoliveQa').value = project.date_finished_golive_qa || '';
        document.getElementById('dateFinishedGoliveBugs').value = project.date_finished_golive_bugs || '';
        
        // Checkboxes
        document.getElementById('managerSentBack').checked = project.manager_sent_back || false;
        document.getElementById('wpReopenedBugs').checked = project.wp_reopened_bugs || false;
        document.getElementById('pageReopenedBugs').checked = project.page_reopened_bugs || false;
        document.getElementById('goliveReopenedBugs').checked = project.golive_reopened_bugs || false;
        document.getElementById('noErrorAfter8Hours').checked = project.no_error_after_8_hours || false;
        document.getElementById('noErrorAfter10Days').checked = project.no_error_after_10_days || false;
        
        // Load tasks for this project
        await loadProjectTasks(project.id);
        
    } else {
        // Add mode - hide tasks section
        title.innerHTML = '<i class="fas fa-plus"></i> Add Project';
        document.getElementById('projectId').value = '';
        document.getElementById('liveSiteLink').value = '';
        tasksSection.style.display = 'none';
        renderTasksList([]);
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close project modal
function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Load all projects
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading projects...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('projects')
            .select(`
                *,
                users:assigned_webmaster (id, name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allProjects = data || [];
        renderProjectsGrid(allProjects);
        
    } catch (err) {
        console.error('Error loading projects:', err);
        grid.innerHTML = '<div class="loading-state error"><i class="fas fa-exclamation-circle"></i> Error loading projects</div>';
    }
}

// Render projects as cards
function renderProjectsGrid(projects) {
    const grid = document.getElementById('projectsGrid');
    const countEl = document.getElementById('projectsCount');
    const user = getCurrentUser();
    const isManager = user.role === 'manager';
    
    countEl.textContent = projects.length;
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="loading-state"><i class="fas fa-folder-open"></i> No projects found</div>';
        return;
    }
    
    grid.innerHTML = projects.map(project => `
        <div class="project-card">
            <div class="project-card-header">
                <span class="status-badge ${getStatusClass(project.project_status)}">${project.project_status || 'Unknown'}</span>
                <div class="project-actions">
                    <button class="btn-icon" onclick="editProject(${project.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isManager ? `
                    <button class="btn-icon danger" onclick="deleteProject(${project.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <h3 class="project-name">${escapeHtml(project.project_name)}</h3>
            <div class="project-meta">
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${project.users?.name || 'Unassigned'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Assigned: ${project.webmaster_assigned_date ? formatDate(project.webmaster_assigned_date) : 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-flag"></i>
                    <span>Target: ${project.target_date ? formatDate(project.target_date) : 'Not set'}</span>
                </div>
            </div>
            <div class="project-footer">
                <a href="${escapeHtml(project.ticket_link)}" target="_blank" class="btn btn-sm btn-outline">
                    <i class="fas fa-external-link-alt"></i> Ticket
                </a>
                ${project.live_site_link ? `
                <a href="${escapeHtml(project.live_site_link)}" target="_blank" class="btn btn-sm btn-outline btn-success">
                    <i class="fas fa-globe"></i> Live Site
                </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Handle project form submission
async function handleProjectSubmit(event) {
    event.preventDefault();
    
    const projectId = document.getElementById('projectId').value;
    
    const projectData = {
        project_name: document.getElementById('projectName').value,
        ticket_link: document.getElementById('ticketLink').value,
        live_site_link: document.getElementById('liveSiteLink').value || null,
        project_status: document.getElementById('projectStatus').value,
        assigned_webmaster: document.getElementById('assignedWebmaster').value || null,
        design_approved_date: document.getElementById('designApprovedDate').value,
        webmaster_assigned_date: document.getElementById('webmasterAssignedDate').value,
        target_date: document.getElementById('targetDate').value || null,
        signed_up_date: document.getElementById('signedUpDate').value || null,
        contract_start_date: document.getElementById('contractStartDate').value || null,
        dns_changed_date: document.getElementById('dnsChangedDate').value || null,
        date_sent_to_wp_qa: document.getElementById('dateSentToWpQa').value || null,
        date_finished_wp_qa: document.getElementById('dateFinishedWpQa').value || null,
        date_finished_wp_bugs: document.getElementById('dateFinishedWpBugs').value || null,
        date_sent_to_page_qa: document.getElementById('dateSentToPageQa').value || null,
        date_finished_page_qa: document.getElementById('dateFinishedPageQa').value || null,
        date_finished_page_bugs: document.getElementById('dateFinishedPageBugs').value || null,
        date_sent_to_golive_qa: document.getElementById('dateSentToGoliveQa').value || null,
        date_finished_golive_qa: document.getElementById('dateFinishedGoliveQa').value || null,
        date_finished_golive_bugs: document.getElementById('dateFinishedGoliveBugs').value || null,
        manager_sent_back: document.getElementById('managerSentBack').checked,
        wp_reopened_bugs: document.getElementById('wpReopenedBugs').checked,
        page_reopened_bugs: document.getElementById('pageReopenedBugs').checked,
        golive_reopened_bugs: document.getElementById('goliveReopenedBugs').checked,
        no_error_after_8_hours: document.getElementById('noErrorAfter8Hours').checked,
        no_error_after_10_days: document.getElementById('noErrorAfter10Days').checked
    };
    
    try {
        let error;
        
        if (projectId) {
            // Update existing project
            const { error: updateError } = await supabaseClient
                .from('projects')
                .update(projectData)
                .eq('id', projectId);
            error = updateError;
        } else {
            // Create new project
            const { error: insertError } = await supabaseClient
                .from('projects')
                .insert([projectData]);
            error = insertError;
        }
        
        if (error) throw error;
        
        closeProjectModal();
        await loadProjects();
        
    } catch (err) {
        console.error('Error saving project:', err);
        alert('Error saving project. Please try again.');
    }
}

// Edit project
function editProject(projectId) {
    const project = allProjects.find(p => p.id === projectId);
    if (project) {
        openProjectModal(project);
    }
}

// Delete project
async function deleteProject(projectId) {
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;
    
    if (!confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
        return;
    }
    
    try {
        // First delete related tasks
        await supabaseClient
            .from('tasks')
            .delete()
            .eq('project_id', projectId);
        
        // Then delete the project
        const { error } = await supabaseClient
            .from('projects')
            .delete()
            .eq('id', projectId);
        
        if (error) throw error;
        
        await loadProjects();
        
    } catch (err) {
        console.error('Error deleting project:', err);
        alert('Error deleting project. Please try again.');
    }
}

// Get status badge class
function getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    
    // Map exact database statuses to CSS classes
    if (statusLower.includes('wp conversion - pending')) return 'wp-conversion';
    if (statusLower.includes('wp conversion qa')) return 'wp-qa';
    if (statusLower.includes('page creation - pending')) return 'page-pending';
    if (statusLower.includes('page creation qa - fixing')) return 'page-fixing';
    if (statusLower.includes('page creation qa - verifying')) return 'page-verifying';
    if (statusLower.includes('page creation qa')) return 'page-qa';
    if (statusLower.includes('golive approval')) return 'golive-approval';
    if (statusLower.includes('golive qa - fixing')) return 'golive-fixing';
    if (statusLower.includes('golive qa')) return 'golive-qa';
    if (statusLower === 'live') return 'live';
    if (statusLower === 'completed') return 'completed';
    
    return '';
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====================================
// Task Management Functions
// ====================================

// Setup task handlers
function setupTaskHandlers() {
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openTaskModal());
    }
}

// Load tasks for a project
async function loadProjectTasks(projectId) {
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentProjectTasks = data || [];
        renderTasksList(currentProjectTasks);
        
    } catch (err) {
        console.error('Error loading tasks:', err);
        currentProjectTasks = [];
        renderTasksList([]);
    }
}

// Render tasks list
function renderTasksList(tasks) {
    const container = document.getElementById('tasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks found for this project</div>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-item ${getTaskStatusClass(task)}">
            <div class="task-header">
                <span class="task-name">${escapeHtml(task.task_name)}</span>
                <div class="task-actions">
                    <button type="button" class="btn-icon" onclick="editTask(${task.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon danger" onclick="deleteTask(${task.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description).substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="task-meta">
                <span class="task-date"><i class="fas fa-paper-plane"></i> Sent: ${task.sent_date ? formatDate(task.sent_date) : 'N/A'}</span>
                <span class="task-date"><i class="fas fa-sync"></i> Updated: ${task.ticket_updated_date ? formatDate(task.ticket_updated_date) : '<span class="text-warning">Pending</span>'}</span>
                <span class="task-date"><i class="fas fa-check-circle"></i> Completed: ${task.completed_date ? formatDate(task.completed_date) : '<span class="text-warning">Pending</span>'}</span>
            </div>
        </div>
    `).join('');
}

// Get task status class
function getTaskStatusClass(task) {
    if (task.completed_date) return 'task-completed';
    if (task.ticket_updated_date) return 'task-updated';
    return 'task-pending';
}

// Open task modal
function openTaskModal(task = null) {
    const projectId = document.getElementById('projectId').value;
    if (!projectId) {
        alert('Please save the project first before adding tasks.');
        return;
    }
    
    // Create task modal if it doesn't exist
    let taskModal = document.getElementById('taskModal');
    if (!taskModal) {
        taskModal = document.createElement('div');
        taskModal.id = 'taskModal';
        taskModal.className = 'modal';
        taskModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="taskModalTitle"><i class="fas fa-tasks"></i> Add Task</h2>
                    <span class="close" onclick="closeTaskModal()">&times;</span>
                </div>
                <form id="taskForm" onsubmit="handleTaskSubmit(event)">
                    <input type="hidden" id="taskId">
                    <input type="hidden" id="taskProjectId">
                    
                    <div class="form-group">
                        <label for="taskName">Task Name *</label>
                        <input type="text" id="taskName" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="taskDescription">Description</label>
                        <textarea id="taskDescription" rows="4"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="taskSentDate">Sent Date *</label>
                            <input type="date" id="taskSentDate" required>
                        </div>
                        <div class="form-group">
                            <label for="taskUpdatedDate">Ticket Updated Date</label>
                            <input type="date" id="taskUpdatedDate">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="taskCompletedDate">Completed Date</label>
                        <input type="date" id="taskCompletedDate">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeTaskModal()"><i class="fas fa-times"></i> Cancel</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Task</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(taskModal);
    }
    
    // Reset and populate form
    const form = document.getElementById('taskForm');
    form.reset();
    document.getElementById('taskProjectId').value = projectId;
    
    if (task) {
        document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskName').value = task.task_name || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskSentDate').value = task.sent_date || '';
        document.getElementById('taskUpdatedDate').value = task.ticket_updated_date || '';
        document.getElementById('taskCompletedDate').value = task.completed_date || '';
    } else {
        document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add Task';
        document.getElementById('taskId').value = '';
        // Default sent date to today
        document.getElementById('taskSentDate').value = new Date().toISOString().split('T')[0];
    }
    
    taskModal.style.display = 'block';
}

// Close task modal
function closeTaskModal() {
    const taskModal = document.getElementById('taskModal');
    if (taskModal) {
        taskModal.style.display = 'none';
    }
}

// Handle task form submission
async function handleTaskSubmit(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const projectId = document.getElementById('taskProjectId').value;
    
    const taskData = {
        project_id: parseInt(projectId),
        task_name: document.getElementById('taskName').value,
        description: document.getElementById('taskDescription').value || null,
        sent_date: document.getElementById('taskSentDate').value,
        ticket_updated_date: document.getElementById('taskUpdatedDate').value || null,
        completed_date: document.getElementById('taskCompletedDate').value || null
    };
    
    try {
        let error;
        
        if (taskId) {
            const { error: updateError } = await supabaseClient
                .from('tasks')
                .update(taskData)
                .eq('id', taskId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient
                .from('tasks')
                .insert([taskData]);
            error = insertError;
        }
        
        if (error) throw error;
        
        closeTaskModal();
        await loadProjectTasks(projectId);
        
    } catch (err) {
        console.error('Error saving task:', err);
        alert('Error saving task. Please try again.');
    }
}

// Edit task
function editTask(taskId) {
    const task = currentProjectTasks.find(t => t.id === taskId);
    if (task) {
        openTaskModal(task);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    const projectId = document.getElementById('projectId').value;
    
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        
        await loadProjectTasks(projectId);
        
    } catch (err) {
        console.error('Error deleting task:', err);
        alert('Error deleting task. Please try again.');
    }
}
