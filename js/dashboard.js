// Dashboard Module with Analytics

let allProjects = [];
let allWebmasters = [];
let allTasks = [];

// Status constants
const LIVE_STATUSES = ['live', 'completed', 'golive qa', 'golive qa - fixing'];
const ACTIVE_EXCLUSIONS = ['live', 'completed'];

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user) return;
    
    setupAnalyticsFilters();
    await loadDashboardData();
});

// Setup analytics filter event listeners
function setupAnalyticsFilters() {
    // Speed ranking filters
    document.getElementById('speedPeriod').addEventListener('change', (e) => {
        document.getElementById('speedCustomDateGroup').style.display = 
            e.target.value === 'custom' ? 'block' : 'none';
    });
    document.getElementById('applySpeedFilter').addEventListener('click', () => {
        renderSpeedRanking(allProjects);
    });

    // Conversion filters
    document.getElementById('conversionPeriod').addEventListener('change', (e) => {
        document.getElementById('conversionCustomDateGroup').style.display = 
            e.target.value === 'custom' ? 'block' : 'none';
    });
    document.getElementById('applyConversionFilter').addEventListener('click', () => {
        renderConversionStats(allProjects);
    });

    // Live sites filters
    document.getElementById('livePeriod').addEventListener('change', (e) => {
        document.getElementById('liveCustomDateGroup').style.display = 
            e.target.value === 'custom' ? 'block' : 'none';
    });
    document.getElementById('applyLiveFilter').addEventListener('click', () => {
        renderLiveSitesStats(allProjects);
    });
}

// Get date range based on period selection
function getDateRange(periodSelectId, customDateId) {
    const period = document.getElementById(periodSelectId).value;
    const today = new Date();
    let fromDate;

    if (period === 'custom') {
        const customDate = document.getElementById(customDateId).value;
        fromDate = customDate ? new Date(customDate) : new Date(today.setMonth(today.getMonth() - 3));
    } else {
        fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - parseInt(period));
    }

    return fromDate;
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Get all projects with user info
        const { data: projects, error: projectsError } = await supabaseClient
            .from('projects')
            .select(`
                *,
                users:assigned_webmaster (id, name)
            `);
        
        if (projectsError) throw projectsError;
        
        // Get all tasks with project info
        const { data: tasks, error: tasksError } = await supabaseClient
            .from('tasks')
            .select(`
                *,
                projects:project_id (id, project_name, ticket_link, assigned_webmaster, users:assigned_webmaster (id, name))
            `);
        
        if (tasksError) throw tasksError;
        
        // Get total users
        const { count: totalUsers } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Get webmasters
        const { data: webmasters } = await supabaseClient
            .from('users')
            .select('id, name')
            .in('role', ['webmaster_level_1', 'webmaster_level_2']);
        
        allProjects = projects || [];
        allWebmasters = webmasters || [];
        allTasks = tasks || [];
        
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
            return !ACTIVE_EXCLUSIONS.includes(status);
        }).length;
        
        // Update UI stats
        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('activeProjects').textContent = activeProjects;
        document.getElementById('liveProjects').textContent = liveProjects;
        document.getElementById('completedProjects').textContent = completedProjects;
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        
        // Render sections
        renderStageBreakdown(allProjects);
        renderWorkload(allProjects);
        renderSpeedRanking(allProjects);
        renderConversionStats(allProjects);
        renderLiveSitesStats(allProjects);
        renderOverdueTasks(allTasks);
        renderStuckProjects(allProjects);
        
    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

// Render stage breakdown
function renderStageBreakdown(projects) {
    const container = document.getElementById('stageCards');
    
    const stages = [
        { key: 'WP conversion - Pending', label: 'WP Conversion', icon: 'fa-code', color: '#f39c12' },
        { key: 'WP Conversion QA', label: 'WP Conversion QA', icon: 'fa-search', color: '#e67e22' },
        { key: 'Page Creation - Pending', label: 'Page Creation', icon: 'fa-file', color: '#9b59b6' },
        { key: 'Page creation QA', label: 'Page QA', icon: 'fa-search', color: '#3498db' },
        { key: 'Page creation QA - Verifying', label: 'Page Verifying', icon: 'fa-check-double', color: '#17a2b8' },
        { key: 'Page creation QA - Fixing', label: 'Page Fixing', icon: 'fa-wrench', color: '#e74c3c' },
        { key: 'Golive Approval Pending', label: 'Golive Approval', icon: 'fa-hourglass-half', color: '#6f42c1' },
        { key: 'Golive QA', label: 'Golive QA', icon: 'fa-rocket', color: '#20c997' },
        { key: 'Golive QA - Fixing', label: 'Golive Fixing', icon: 'fa-tools', color: '#dc3545' },
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

// Status weight mapping for workload calculation
const STATUS_WEIGHTS = {
    'wp conversion - pending': 10,
    'wp conversion qa': 8,
    'page creation - pending': 6,
    'page creation qa': 5,
    'page creation qa - fixing': 4,
    'page creation qa - verifying': 3,
    'golive approval pending': 2,
    'golive qa': 1,
    'golive qa - fixing': 1
};

// Get weight for a project based on its status
function getProjectWeight(status) {
    if (!status) return 0;
    const statusLower = status.toLowerCase();
    return STATUS_WEIGHTS[statusLower] || 0;
}

// Get workload level based on score
function getWorkloadLevel(score) {
    if (score >= 50) return { level: 'critical', label: 'Critical', color: '#ef4444' };
    if (score >= 35) return { level: 'high', label: 'High', color: '#f59e0b' };
    if (score >= 20) return { level: 'moderate', label: 'Moderate', color: '#3b82f6' };
    return { level: 'light', label: 'Light', color: '#10b981' };
}

// Render workload by webmaster (expandable)
function renderWorkload(projects) {
    const container = document.getElementById('workloadList');
    
    // Filter out Live and Completed projects
    const activeProjects = projects.filter(p => {
        const status = (p.project_status || '').toLowerCase();
        return !ACTIVE_EXCLUSIONS.includes(status);
    });
    
    // Group projects by webmaster and calculate weighted score
    const workloadMap = {};
    
    activeProjects.forEach(project => {
        if (!project.users) return;
        
        const webmasterId = project.assigned_webmaster;
        const webmasterName = project.users.name;
        
        if (!workloadMap[webmasterId]) {
            workloadMap[webmasterId] = {
                id: webmasterId,
                name: webmasterName,
                projects: [],
                totalScore: 0
            };
        }
        
        const weight = getProjectWeight(project.project_status);
        workloadMap[webmasterId].projects.push({
            ...project,
            weight: weight
        });
        workloadMap[webmasterId].totalScore += weight;
    });
    
    // Sort by score (highest workload first)
    const workloadList = Object.values(workloadMap).sort((a, b) => b.totalScore - a.totalScore);
    
    if (workloadList.length === 0) {
        container.innerHTML = '<div class="empty-state">No active workload data available</div>';
        return;
    }
    
    const maxScore = Math.max(...workloadList.map(w => w.totalScore), 1);
    
    container.innerHTML = workloadList.map(w => {
        const workloadLevel = getWorkloadLevel(w.totalScore);
        const barWidth = (w.totalScore / maxScore) * 100;
        
        // Sort projects by weight (heaviest first)
        const sortedProjects = [...w.projects].sort((a, b) => b.weight - a.weight);
        
        return `
        <div class="workload-item expandable" data-webmaster-id="${w.id}">
            <div class="workload-header" onclick="toggleWorkloadDetails(${w.id})">
                <span class="webmaster-name">
                    <i class="fas fa-user"></i> ${escapeHtml(w.name)}
                    <i class="fas fa-chevron-down expand-icon"></i>
                </span>
                <span class="workload-stats">
                    <span class="workload-score" style="color: ${workloadLevel.color}">
                        <i class="fas fa-weight-hanging"></i> ${w.totalScore} pts
                    </span>
                    <span class="workload-level" style="background: ${workloadLevel.color}20; color: ${workloadLevel.color}">
                        ${workloadLevel.label}
                    </span>
                    <span class="project-count-small">${w.projects.length} projects</span>
                </span>
            </div>
            <div class="workload-bar">
                <div class="bar-fill" style="width: ${barWidth}%; background: linear-gradient(90deg, ${workloadLevel.color}, ${workloadLevel.color}aa)"></div>
            </div>
            <div class="workload-details" id="workload-details-${w.id}" style="display: none;">
                <div class="workload-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Score:</span>
                        <span class="summary-value">${w.totalScore} points</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Active Projects:</span>
                        <span class="summary-value">${w.projects.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Average Weight:</span>
                        <span class="summary-value">${(w.totalScore / w.projects.length).toFixed(1)} pts/project</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Workload Level:</span>
                        <span class="summary-value" style="color: ${workloadLevel.color}">${workloadLevel.label}</span>
                    </div>
                </div>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Status</th>
                            <th>Weight</th>
                            <th>Target Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedProjects.map(p => `
                            <tr>
                                <td><a href="${escapeHtml(p.ticket_link)}" target="_blank" class="project-link">${escapeHtml(p.project_name)}</a></td>
                                <td><span class="status-badge ${getStatusClass(p.project_status)}">${p.project_status || 'N/A'}</span></td>
                                <td><span class="weight-badge weight-${p.weight >= 8 ? 'high' : p.weight >= 5 ? 'medium' : 'low'}">${p.weight} pts</span></td>
                                <td>${p.target_date ? formatDate(p.target_date) : 'Not set'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    }).join('');
}

// Toggle workload details
function toggleWorkloadDetails(webmasterId) {
    const details = document.getElementById(`workload-details-${webmasterId}`);
    const item = details.closest('.workload-item');
    const icon = item.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        item.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        details.style.display = 'none';
        item.classList.remove('expanded');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Render WP Conversion Speed Ranking
function renderSpeedRanking(projects) {
    const container = document.getElementById('speedRankingContent');
    const fromDate = getDateRange('speedPeriod', 'speedFromDate');
    
    // Filter projects with date_sent_to_wp_qa within the period
    const validProjects = projects.filter(p => {
        if (!p.date_sent_to_wp_qa || !p.webmaster_assigned_date || !p.users) return false;
        const sentDate = new Date(p.date_sent_to_wp_qa);
        return sentDate >= fromDate;
    });
    
    // Calculate days taken for each project
    const projectsWithDays = validProjects.map(p => {
        const assignedDate = new Date(p.webmaster_assigned_date);
        const sentDate = new Date(p.date_sent_to_wp_qa);
        const daysTaken = Math.ceil((sentDate - assignedDate) / (1000 * 60 * 60 * 24));
        return {
            ...p,
            daysTaken: Math.max(0, daysTaken)
        };
    });
    
    // Group by webmaster and calculate average
    const webmasterStats = {};
    
    projectsWithDays.forEach(p => {
        const wmId = p.assigned_webmaster;
        const wmName = p.users.name;
        
        if (!webmasterStats[wmId]) {
            webmasterStats[wmId] = {
                id: wmId,
                name: wmName,
                projects: [],
                totalDays: 0
            };
        }
        
        webmasterStats[wmId].projects.push(p);
        webmasterStats[wmId].totalDays += p.daysTaken;
    });
    
    // Calculate averages and sort
    const rankings = Object.values(webmasterStats)
        .map(wm => ({
            ...wm,
            avgDays: (wm.totalDays / wm.projects.length).toFixed(1),
            count: wm.projects.length
        }))
        .sort((a, b) => parseFloat(a.avgDays) - parseFloat(b.avgDays));
    
    if (rankings.length === 0) {
        container.innerHTML = '<div class="empty-state">No WP conversion data available for the selected period</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="ranking-list">
            ${rankings.map((wm, index) => `
                <div class="ranking-item expandable" data-ranking-id="speed-${wm.id}">
                    <div class="ranking-header" onclick="toggleRankingDetails('speed-${wm.id}')">
                        <span class="rank-badge ${index < 3 ? 'top-' + (index + 1) : ''}">#${index + 1}</span>
                        <span class="ranking-name">${escapeHtml(wm.name)}</span>
                        <span class="ranking-stats">
                            <span class="avg-days">${wm.avgDays} days avg</span>
                            <span class="project-count">${wm.count} projects</span>
                            <i class="fas fa-chevron-down expand-icon"></i>
                        </span>
                    </div>
                    <div class="ranking-details" id="ranking-details-speed-${wm.id}" style="display: none;">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Assigned Date</th>
                                    <th>Sent to QA</th>
                                    <th>Days Taken</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wm.projects.sort((a, b) => a.daysTaken - b.daysTaken).map(p => `
                                    <tr>
                                        <td><a href="${escapeHtml(p.ticket_link)}" target="_blank" class="project-link">${escapeHtml(p.project_name)}</a></td>
                                        <td>${formatDate(p.webmaster_assigned_date)}</td>
                                        <td>${formatDate(p.date_sent_to_wp_qa)}</td>
                                        <td><span class="days-badge ${p.daysTaken <= 5 ? 'fast' : p.daysTaken <= 10 ? 'medium' : 'slow'}">${p.daysTaken} days</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Toggle ranking details
function toggleRankingDetails(rankingId) {
    const details = document.getElementById(`ranking-details-${rankingId}`);
    const item = details.closest('.ranking-item');
    const icon = item.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        item.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        details.style.display = 'none';
        item.classList.remove('expanded');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Render WP Conversions Completed Stats
function renderConversionStats(projects) {
    const container = document.getElementById('conversionContent');
    const fromDate = getDateRange('conversionPeriod', 'conversionFromDate');
    
    // Filter projects with date_sent_to_wp_qa within the period
    const validProjects = projects.filter(p => {
        if (!p.date_sent_to_wp_qa || !p.users) return false;
        const sentDate = new Date(p.date_sent_to_wp_qa);
        return sentDate >= fromDate;
    });
    
    // Group by webmaster
    const webmasterStats = {};
    
    validProjects.forEach(p => {
        const wmId = p.assigned_webmaster;
        const wmName = p.users.name;
        
        if (!webmasterStats[wmId]) {
            webmasterStats[wmId] = {
                id: wmId,
                name: wmName,
                projects: []
            };
        }
        
        webmasterStats[wmId].projects.push(p);
    });
    
    // Sort by count
    const stats = Object.values(webmasterStats)
        .sort((a, b) => b.projects.length - a.projects.length);
    
    if (stats.length === 0) {
        container.innerHTML = '<div class="empty-state">No WP conversion completion data available for the selected period</div>';
        return;
    }
    
    const maxCount = Math.max(...stats.map(s => s.projects.length), 1);
    
    container.innerHTML = `
        <div class="conversion-list">
            ${stats.map(wm => `
                <div class="conversion-item expandable" data-conversion-id="${wm.id}">
                    <div class="conversion-header" onclick="toggleConversionDetails(${wm.id})">
                        <span class="webmaster-name">
                            <i class="fas fa-user"></i> ${escapeHtml(wm.name)}
                        </span>
                        <span class="conversion-count">${wm.projects.length} conversions</span>
                        <i class="fas fa-chevron-down expand-icon"></i>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(wm.projects.length / maxCount) * 100}%"></div>
                    </div>
                    <div class="conversion-details" id="conversion-details-${wm.id}" style="display: none;">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Sent to WP QA</th>
                                    <th>Current Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wm.projects.sort((a, b) => new Date(b.date_sent_to_wp_qa) - new Date(a.date_sent_to_wp_qa)).map(p => `
                                    <tr>
                                        <td><a href="${escapeHtml(p.ticket_link)}" target="_blank" class="project-link">${escapeHtml(p.project_name)}</a></td>
                                        <td>${formatDate(p.date_sent_to_wp_qa)}</td>
                                        <td><span class="status-badge ${getStatusClass(p.project_status)}">${p.project_status || 'N/A'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Toggle conversion details
function toggleConversionDetails(webmasterId) {
    const details = document.getElementById(`conversion-details-${webmasterId}`);
    const item = details.closest('.conversion-item');
    const icon = item.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        item.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        details.style.display = 'none';
        item.classList.remove('expanded');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Render Sites Sent Live Stats
function renderLiveSitesStats(projects) {
    const container = document.getElementById('liveContent');
    const fromDate = getDateRange('livePeriod', 'liveFromDate');
    
    // Filter projects in live statuses
    const liveProjects = projects.filter(p => {
        if (!p.users) return false;
        const status = (p.project_status || '').toLowerCase();
        const isLiveStatus = LIVE_STATUSES.includes(status);
        
        // Check if dns_changed_date or created_at is within period
        const relevantDate = p.dns_changed_date ? new Date(p.dns_changed_date) : new Date(p.created_at);
        return isLiveStatus && relevantDate >= fromDate;
    });
    
    // Group by webmaster
    const webmasterStats = {};
    
    liveProjects.forEach(p => {
        const wmId = p.assigned_webmaster;
        const wmName = p.users.name;
        
        if (!webmasterStats[wmId]) {
            webmasterStats[wmId] = {
                id: wmId,
                name: wmName,
                projects: []
            };
        }
        
        webmasterStats[wmId].projects.push(p);
    });
    
    // Sort by count
    const stats = Object.values(webmasterStats)
        .sort((a, b) => b.projects.length - a.projects.length);
    
    if (stats.length === 0) {
        container.innerHTML = '<div class="empty-state">No live sites data available for the selected period</div>';
        return;
    }
    
    const maxCount = Math.max(...stats.map(s => s.projects.length), 1);
    
    container.innerHTML = `
        <div class="live-list">
            ${stats.map(wm => `
                <div class="live-item expandable" data-live-id="${wm.id}">
                    <div class="live-header" onclick="toggleLiveDetails(${wm.id})">
                        <span class="webmaster-name">
                            <i class="fas fa-user"></i> ${escapeHtml(wm.name)}
                        </span>
                        <span class="live-count">${wm.projects.length} sites live</span>
                        <i class="fas fa-chevron-down expand-icon"></i>
                    </div>
                    <div class="progress-bar live-bar">
                        <div class="progress-fill" style="width: ${(wm.projects.length / maxCount) * 100}%"></div>
                    </div>
                    <div class="live-details" id="live-details-${wm.id}" style="display: none;">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Status</th>
                                    <th>DNS Changed</th>
                                    <th>Target Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wm.projects.sort((a, b) => new Date(b.dns_changed_date || b.created_at) - new Date(a.dns_changed_date || a.created_at)).map(p => `
                                    <tr>
                                        <td><a href="${escapeHtml(p.ticket_link)}" target="_blank" class="project-link">${escapeHtml(p.project_name)}</a></td>
                                        <td><span class="status-badge ${getStatusClass(p.project_status)}">${p.project_status || 'N/A'}</span></td>
                                        <td>${p.dns_changed_date ? formatDate(p.dns_changed_date) : 'N/A'}</td>
                                        <td>${p.target_date ? formatDate(p.target_date) : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Toggle live details
function toggleLiveDetails(webmasterId) {
    const details = document.getElementById(`live-details-${webmasterId}`);
    const item = details.closest('.live-item');
    const icon = item.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        item.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        details.style.display = 'none';
        item.classList.remove('expanded');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Get status badge class
function getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    
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
// Overdue Tasks Analysis
// ====================================

// Calculate business days between two dates (excluding weekends)
function getBusinessDaysDiff(startDate, endDate) {
    let count = 0;
    const curDate = new Date(startDate);
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}

// Render overdue tasks (tasks with null ticket_updated_date or completed_date for >3 business days)
function renderOverdueTasks(tasks) {
    const container = document.getElementById('overdueTasksContent');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter tasks that are overdue
    const overdueTasks = tasks.filter(task => {
        // Skip if task is completed
        if (task.completed_date) return false;
        
        // Check if ticket_updated_date or completed_date is null
        const sentDate = task.sent_date ? new Date(task.sent_date) : null;
        if (!sentDate) return false;
        
        const businessDays = getBusinessDaysDiff(sentDate, today);
        
        // If no ticket_updated_date and more than 3 business days since sent
        if (!task.ticket_updated_date && businessDays > 3) {
            return true;
        }
        
        // If ticket was updated but no completed_date and more than 3 business days since update
        if (task.ticket_updated_date && !task.completed_date) {
            const updatedDate = new Date(task.ticket_updated_date);
            const daysSinceUpdate = getBusinessDaysDiff(updatedDate, today);
            if (daysSinceUpdate > 3) {
                return true;
            }
        }
        
        return false;
    }).map(task => {
        const sentDate = new Date(task.sent_date);
        const businessDays = getBusinessDaysDiff(sentDate, today);
        return {
            ...task,
            overdueDays: businessDays
        };
    }).sort((a, b) => b.overdueDays - a.overdueDays);
    
    if (overdueTasks.length === 0) {
        container.innerHTML = '<div class="empty-state success"><i class="fas fa-check-circle"></i> No overdue tasks found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="overdue-count">${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}</div>
        <div class="overdue-list">
            ${overdueTasks.map(task => `
                <div class="overdue-item ${task.overdueDays > 7 ? 'critical' : task.overdueDays > 5 ? 'warning' : ''}">
                    <div class="overdue-header">
                        <span class="overdue-task-name">${escapeHtml(task.task_name)}</span>
                        <span class="overdue-days ${task.overdueDays > 7 ? 'critical' : task.overdueDays > 5 ? 'warning' : ''}">${task.overdueDays} business days</span>
                    </div>
                    <div class="overdue-meta">
                        <span><i class="fas fa-project-diagram"></i> 
                            <a href="${escapeHtml(task.projects?.ticket_link || '#')}" target="_blank" class="project-link">
                                ${escapeHtml(task.projects?.project_name || 'Unknown Project')}
                            </a>
                        </span>
                        <span><i class="fas fa-user"></i> ${escapeHtml(task.projects?.users?.name || 'Unassigned')}</span>
                        <span><i class="fas fa-paper-plane"></i> Sent: ${formatDate(task.sent_date)}</span>
                        ${task.ticket_updated_date ? `<span><i class="fas fa-sync"></i> Updated: ${formatDate(task.ticket_updated_date)}</span>` : '<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Never updated</span>'}
                    </div>
                    ${task.description ? `<div class="overdue-description">${escapeHtml(task.description).substring(0, 80)}${task.description.length > 80 ? '...' : ''}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// ====================================
// Stuck Projects Analysis
// ====================================

// Format duration nicely
function formatDuration(days) {
    if (days >= 365) {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        return `${years}y ${months}m`;
    } else if (days >= 30) {
        const months = Math.floor(days / 30);
        const weeks = Math.floor((days % 30) / 7);
        return `${months}m ${weeks}w`;
    } else if (days >= 7) {
        const weeks = Math.floor(days / 7);
        const d = days % 7;
        return `${weeks}w ${d}d`;
    }
    return `${days}d`;
}

// Render stuck projects (projects in same status for extended period)
function renderStuckProjects(projects) {
    const container = document.getElementById('stuckProjectsContent');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter active projects (not Live or Completed)
    const stuckProjects = projects
        .filter(p => {
            const status = (p.project_status || '').toLowerCase();
            return !['live', 'completed'].includes(status);
        })
        .map(project => {
            // Determine when the project entered its current status
            // We'll use the most recent relevant date based on status
            let statusEntryDate = null;
            const status = (project.project_status || '').toLowerCase();
            
            if (status.includes('wp conversion - pending')) {
                statusEntryDate = project.webmaster_assigned_date;
            } else if (status.includes('wp conversion qa')) {
                statusEntryDate = project.date_sent_to_wp_qa;
            } else if (status.includes('page creation - pending')) {
                statusEntryDate = project.date_finished_wp_qa || project.date_finished_wp_bugs;
            } else if (status.includes('page creation qa')) {
                statusEntryDate = project.date_sent_to_page_qa;
            } else if (status.includes('golive approval')) {
                statusEntryDate = project.date_finished_page_qa || project.date_finished_page_bugs;
            } else if (status.includes('golive qa')) {
                statusEntryDate = project.date_sent_to_golive_qa;
            }
            
            // Fallback to created_at if no status entry date found
            if (!statusEntryDate) {
                statusEntryDate = project.created_at;
            }
            
            const entryDate = new Date(statusEntryDate);
            const daysInStatus = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
            
            return {
                ...project,
                statusEntryDate: statusEntryDate,
                daysInStatus: daysInStatus
            };
        })
        .filter(p => p.daysInStatus >= 7) // Only show projects stuck for at least 7 days
        .sort((a, b) => b.daysInStatus - a.daysInStatus);
    
    if (stuckProjects.length === 0) {
        container.innerHTML = '<div class="empty-state success"><i class="fas fa-check-circle"></i> No stuck projects found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="stuck-count">${stuckProjects.length} project${stuckProjects.length !== 1 ? 's' : ''} stuck</div>
        <div class="stuck-list">
            ${stuckProjects.map(project => `
                <div class="stuck-item ${project.daysInStatus > 30 ? 'critical' : project.daysInStatus > 14 ? 'warning' : ''}">
                    <div class="stuck-header">
                        <a href="${escapeHtml(project.ticket_link)}" target="_blank" class="project-link stuck-name">
                            ${escapeHtml(project.project_name)}
                        </a>
                        <span class="stuck-duration ${project.daysInStatus > 30 ? 'critical' : project.daysInStatus > 14 ? 'warning' : ''}">${formatDuration(project.daysInStatus)}</span>
                    </div>
                    <div class="stuck-meta">
                        <span class="status-badge ${getStatusClass(project.project_status)}">${project.project_status}</span>
                        <span><i class="fas fa-user"></i> ${escapeHtml(project.users?.name || 'Unassigned')}</span>
                        <span><i class="fas fa-calendar"></i> Since: ${formatDate(project.statusEntryDate)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
