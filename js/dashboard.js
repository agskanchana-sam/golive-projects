// Dashboard Module with Analytics

let allProjects = [];
let allWebmasters = [];

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

// Render workload by webmaster (expandable)
function renderWorkload(projects) {
    const container = document.getElementById('workloadList');
    
    // Filter out Live and Completed projects
    const activeProjects = projects.filter(p => {
        const status = (p.project_status || '').toLowerCase();
        return !ACTIVE_EXCLUSIONS.includes(status);
    });
    
    // Group projects by webmaster
    const workloadMap = {};
    
    activeProjects.forEach(project => {
        if (!project.users) return;
        
        const webmasterId = project.assigned_webmaster;
        const webmasterName = project.users.name;
        
        if (!workloadMap[webmasterId]) {
            workloadMap[webmasterId] = {
                id: webmasterId,
                name: webmasterName,
                projects: []
            };
        }
        
        workloadMap[webmasterId].projects.push(project);
    });
    
    const workloadList = Object.values(workloadMap).sort((a, b) => b.projects.length - a.projects.length);
    
    if (workloadList.length === 0) {
        container.innerHTML = '<div class="empty-state">No active workload data available</div>';
        return;
    }
    
    const maxActive = Math.max(...workloadList.map(w => w.projects.length), 1);
    
    container.innerHTML = workloadList.map(w => `
        <div class="workload-item expandable" data-webmaster-id="${w.id}">
            <div class="workload-header" onclick="toggleWorkloadDetails(${w.id})">
                <span class="webmaster-name">
                    <i class="fas fa-user"></i> ${escapeHtml(w.name)}
                    <i class="fas fa-chevron-down expand-icon"></i>
                </span>
                <span class="workload-stats">
                    <span class="active-count">${w.projects.length} active</span>
                </span>
            </div>
            <div class="workload-bar">
                <div class="bar-fill" style="width: ${(w.projects.length / maxActive) * 100}%"></div>
            </div>
            <div class="workload-details" id="workload-details-${w.id}" style="display: none;">
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Status</th>
                            <th>Target Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${w.projects.map(p => `
                            <tr>
                                <td><a href="${escapeHtml(p.ticket_link)}" target="_blank" class="project-link">${escapeHtml(p.project_name)}</a></td>
                                <td><span class="status-badge ${getStatusClass(p.project_status)}">${p.project_status || 'N/A'}</span></td>
                                <td>${p.target_date ? formatDate(p.target_date) : 'Not set'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
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
