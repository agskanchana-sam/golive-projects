// Users Management Module

let allUsers = [];

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Only managers can access this page
    if (user.role !== 'manager') {
        window.location.href = 'dashboard.html';
        return;
    }
    
    setupUserModal();
    await loadUsers();
});

// Setup modal event handlers
function setupUserModal() {
    const modal = document.getElementById('userModal');
    const addBtn = document.getElementById('addUserBtn');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelUserBtn');
    const form = document.getElementById('userForm');
    
    addBtn.addEventListener('click', () => openUserModal());
    closeBtn.addEventListener('click', () => closeUserModal());
    cancelBtn.addEventListener('click', () => closeUserModal());
    form.addEventListener('submit', handleUserSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeUserModal();
    });
}

// Open user modal for add/edit
function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('userForm');
    const passwordHint = document.getElementById('passwordHint');
    const passwordField = document.getElementById('userPassword');
    
    form.reset();
    
    if (user) {
        // Edit mode
        title.innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userSchedule').value = user.work_schedule;
        passwordField.required = false;
        passwordHint.style.display = 'block';
    } else {
        // Add mode
        title.innerHTML = '<i class="fas fa-user-plus"></i> Add User';
        document.getElementById('userId').value = '';
        passwordField.required = true;
        passwordHint.style.display = 'none';
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close user modal
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Load all users
async function loadUsers() {
    const tableBody = document.getElementById('usersTable');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading">Loading users...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        allUsers = data || [];
        renderUsersTable();
        
    } catch (err) {
        console.error('Error loading users:', err);
        tableBody.innerHTML = '<tr><td colspan="6" class="loading">Error loading users</td></tr>';
    }
}

// Render users table
function renderUsersTable() {
    const tableBody = document.getElementById('usersTable');
    
    if (allUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = allUsers.map(user => `
        <tr>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="role-badge ${user.role}">${formatRole(user.role)}</span></td>
            <td>${user.work_schedule}</td>
            <td>${formatDate(user.created_at)}</td>
            <td class="actions">
                <button class="btn-icon" onclick="editUser(${user.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteUser(${user.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Handle user form submission
async function handleUserSubmit(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        work_schedule: document.getElementById('userSchedule').value
    };
    
    const password = document.getElementById('userPassword').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        let error;
        
        if (userId) {
            // Update existing user
            const { error: updateError } = await supabaseClient
                .from('users')
                .update(userData)
                .eq('id', userId);
            error = updateError;
        } else {
            // Create new user (password required)
            if (!password) {
                alert('Password is required for new users');
                return;
            }
            const { error: insertError } = await supabaseClient
                .from('users')
                .insert([userData]);
            error = insertError;
        }
        
        if (error) {
            if (error.code === '23505') {
                alert('A user with this email already exists');
            } else {
                throw error;
            }
            return;
        }
        
        closeUserModal();
        await loadUsers();
        
    } catch (err) {
        console.error('Error saving user:', err);
        alert('Error saving user. Please try again.');
    }
}

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        openUserModal(user);
    }
}

// Delete user
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) {
            if (error.code === '23503') {
                alert('Cannot delete user. They have associated projects or other records.');
            } else {
                throw error;
            }
            return;
        }
        
        await loadUsers();
        
    } catch (err) {
        console.error('Error deleting user:', err);
        alert('Error deleting user. Please try again.');
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
