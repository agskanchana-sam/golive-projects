// Authentication Module

// Check if user is logged in
function getCurrentUser() {
    const userJson = localStorage.getItem('goalTrackerUser');
    return userJson ? JSON.parse(userJson) : null;
}

// Save user to local storage
function saveUser(user) {
    localStorage.setItem('goalTrackerUser', JSON.stringify(user));
}

// Remove user from local storage
function removeUser() {
    localStorage.removeItem('goalTrackerUser');
}

// Check authentication and redirect if needed
function checkAuth() {
    const user = getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!user && currentPage !== 'index.html') {
        window.location.href = 'index.html';
        return null;
    }
    
    if (user && currentPage === 'index.html') {
        window.location.href = 'dashboard.html';
        return user;
    }
    
    return user;
}

// Setup navigation based on user role
function setupNavigation(user) {
    if (!user) return;
    
    // Show user info
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.textContent = `${user.name} (${formatRole(user.role)})`;
    }
    
    // Show users link only for managers
    const usersLink = document.getElementById('usersLink');
    if (usersLink && user.role === 'manager') {
        usersLink.style.display = 'inline-block';
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Format role for display
function formatRole(role) {
    const roleMap = {
        'manager': 'Manager',
        'webmaster_level_1': 'Webmaster L1',
        'webmaster_level_2': 'Webmaster L2'
    };
    return roleMap[role] || role;
}

// Logout function
function logout() {
    removeUser();
    window.location.href = 'index.html';
}

// Login form handler
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    
    if (!isSupabaseConfigured()) {
        errorEl.textContent = 'Supabase is not configured. Please update js/supabase-config.js';
        return;
    }
    
    try {
        errorEl.textContent = '';
        
        // Query users table for matching credentials
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
        
        if (error || !data) {
            errorEl.textContent = 'Invalid email or password';
            return;
        }
        
        // Save user (without password)
        const userToSave = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            work_schedule: data.work_schedule
        };
        
        saveUser(userToSave);
        window.location.href = 'dashboard.html';
        
    } catch (err) {
        console.error('Login error:', err);
        errorEl.textContent = 'An error occurred. Please try again.';
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuth();
    
    // Setup login form if on login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup navigation if logged in
    if (user) {
        setupNavigation(user);
    }
});
