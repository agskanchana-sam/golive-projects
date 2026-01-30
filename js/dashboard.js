// Dashboard Module

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user) return;
    
    await loadDashboardData();
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Get all projects
        const { data: projects, error: projectsError } = await supabaseClient
            .from('projects')
            .select(`
                *,
                users:assigned_webmaster (id, name)
            `);
        
        if (projectsError) throw projectsError;
        
        // Get total users
        const { count: totalUsers } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        const allProjects = projects || [];
        
        // Calculate stats
        const totalProjects = allProjects.length;
        const liveProjects = allProjects.filter(p => 
            p.project_status && p.project_status.toLowerCase() === 'live'
        ).length;
        const completedProjects = allProjects.filter(p => 
            p.project_status && p.project_status.toLowerCase() === 'completed'
        ).length;
        const activeProjects = allProjects.filter(p => {
            const status = (p.project_status || '').toLowerCase();
            return status !== 'live' && status !== 'completed';
        }).length;
        
        // Update UI stats
        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('activeProjects').textContent = activeProjects;
        document.getElementById('liveProjects').textContent = liveProjects;
        document.getElementById('completedProjects').textContent = completedProjects;
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        
        // Render stage breakdown
        renderStageBreakdown(allProjects);
        
        // Render workload
        renderWorkload(allProjects);
        
    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

// Render stage breakdown
function renderStageBreakdown(projects) {
    const container = document.getElementById('stageCards');
    
    const stages = [
        { key: 'WP conversion - Pending', label: 'WP Conversion', icon: 'fa-code', color: '#f39c12' },
        { key: 'Page Creation - Pending', label: 'Page Creation Pending', icon: 'fa-file', color: '#9b59b6' },
        { key: 'Page creation QA', label: 'Page Creation QA', icon: 'fa-search', color: '#3498db' },
        { key: 'Page creation QA - Verifying', label: 'Page QA Verifying', icon: 'fa-check-double', color: '#17a2b8' },
        { key: 'Page creation QA - Fixing', label: 'Page QA Fixing', icon: 'fa-wrench', color: '#e67e22' },
        { key: 'Golive Approval Pending', label: 'Golive Approval', icon: 'fa-hourglass-half', color: '#6f42c1' },
        { key: 'Golive QA - Fixing', label: 'Golive QA Fixing', icon: 'fa-tools', color: '#dc3545' },
        { key: 'Live', label: 'Live', icon: 'fa-broadcast-tower', color: '#27ae60' },
        { key: 'Completed', label: 'Completed', icon: 'fa-check-circle', color: '#2ecc71' }
    ];
    
    const stageCounts = stages.map(stage => {
        const count = projects.filter(p => {
            const status = (p.project_status || '').toLowerCase();
            return status === stage.key.toLowerCase();
        }).length;
        return { ...stage, count };
    });
    
    container.innerHTML = stageCounts.map(stage => `
        <div class="stage-card" style="border-left-color: ${stage.color}">
            <div class="stage-icon" style="background: ${stage.color}20; color: ${stage.color}">
                <i class="fas ${stage.icon}"></i>
            </div>
            <div class="stage-info">
                <span class="stage-count">${stage.count}</span>
                <span class="stage-label">${stage.label}</span>
            </div>
        </div>
    `).join('');
}

// Render workload by webmaster
function renderWorkload(projects) {
    const container = document.getElementById('workloadList');
    
    // Group projects by webmaster
    const workloadMap = {};
    
    projects.forEach(project => {
        if (!project.users) return;
        
        const webmasterId = project.assigned_webmaster;
        const webmasterName = project.users.name;
        
        if (!workloadMap[webmasterId]) {
            workloadMap[webmasterId] = {
                name: webmasterName,
                total: 0,
                active: 0,
                completed: 0
            };
        }
        
        workloadMap[webmasterId].total++;
        
        const status = (project.project_status || '').toLowerCase();
        if (status === 'completed' || status === 'live') {
            workloadMap[webmasterId].completed++;
        } else {
            workloadMap[webmasterId].active++;
        }
    });
    
    const workloadList = Object.values(workloadMap).sort((a, b) => b.active - a.active);
    
    if (workloadList.length === 0) {
        container.innerHTML = '<div class="empty-state">No workload data available</div>';
        return;
    }
    
    const maxActive = Math.max(...workloadList.map(w => w.active), 1);
    
    container.innerHTML = workloadList.map(w => `
        <div class="workload-item">
            <div class="workload-header">
                <span class="webmaster-name">
                    <i class="fas fa-user"></i> ${escapeHtml(w.name)}
                </span>
                <span class="workload-stats">
                    <span class="active-count">${w.active} active</span>
                    <span class="total-count">${w.total} total</span>
                </span>
            </div>
            <div class="workload-bar">
                <div class="bar-fill" style="width: ${(w.active / maxActive) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

// Get status badge class
function getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    
    // Map exact database statuses to CSS classes
    if (statusLower.includes('wp conversion')) return 'wp-conversion';
    if (statusLower.includes('page creation - pending')) return 'page-pending';
    if (statusLower.includes('page creation qa - fixing')) return 'page-fixing';
    if (statusLower.includes('page creation qa - verifying')) return 'page-verifying';
    if (statusLower.includes('page creation qa')) return 'page-qa';
    if (statusLower.includes('golive approval')) return 'golive-approval';
    if (statusLower.includes('golive qa')) return 'golive-fixing';
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
