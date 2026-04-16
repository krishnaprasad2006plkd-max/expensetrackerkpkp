// ============================================
// CONFIGURATION - REPLACE WITH YOUR URL
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyUcbCsWoZh3w8T4YZ_ptXcX6ZRGNjumZDXI2AfFsjaITmT-LOb9suRQvuu2GB54IslqQ/exec';

// ============================================
// STATE MANAGEMENT
// ============================================

let transactions = [];
let currentFilter = 'all';
let selectedYear = new Date().getFullYear();
let selectedMonthFilter = 'all';
let currentModalMonth = null;
let currentModalYear = null;
let currentUser = null;
let isOnline = navigator.onLine;

// Month names
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Category icons
const categoryIcons = {
    'Food': '🍔', 'Transport': '🚗', 'Shopping': '🛒', 'Entertainment': '🎬',
    'Bills': '📄', 'Health': '🏥', 'Education': '📚', 'Rent': '🏠',
    'Salary': '💼', 'Freelance': '💻', 'Investment': '📊', 'Gift': '🎁', 'Other': '📌'
};

// Category colors
const categoryColors = [
    '#667eea', '#764ba2', '#f45c43', '#eb3349', '#38ef7d', 
    '#11998e', '#4facfe', '#00f2fe', '#fa709a', '#fee140',
    '#a8edea', '#fed6e3', '#d299c2'
];

// ============================================
// DOM ELEMENTS
// ============================================

const transactionForm = document.getElementById('transactionForm');
const transactionList = document.getElementById('transactionList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const searchInput = document.getElementById('searchInput');
const monthFilter = document.getElementById('monthFilter');
const modalOverlay = document.getElementById('modalOverlay');
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const syncStatus = document.getElementById('syncStatus');
const userInfo = document.getElementById('userInfo');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userAvatarEl = document.getElementById('userAvatar');
const offlineBanner = document.getElementById('offlineBanner');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const mainContainer = document.getElementById('mainContainer');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check for saved user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        hideAuthOverlay();
        showUserInfo();
        loadTransactions();
    } else {
        showAuthOverlay();
        mainContainer.style.display = 'none';
    }
    
    // Set default date
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('selectedYear').textContent = selectedYear;
    
    // Online/Offline handlers
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (!navigator.onLine) {
        handleOffline();
    }
    
    // Form submission
    transactionForm.addEventListener('submit', handleFormSubmit);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    
    // Modal overlay click
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);
    
    // Enter key for auth forms
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('confirmPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleRegister();
    });
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function showAuthOverlay() {
    authOverlay.classList.remove('hidden');
    mainContainer.style.display = 'none';
}

function hideAuthOverlay() {
    authOverlay.classList.add('hidden');
    mainContainer.style.display = 'flex';
}

function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    clearAuthForms();
}

function showRegisterForm() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    clearAuthForms();
}

function clearAuthForms() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

function showLoading(message = 'Loading...') {
    loadingText.textContent = message;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    if (!email) {
        showNotification('Please enter your email', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }
    
    showLoading('Signing in...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'loginUser',
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            currentUser = {
                userId: result.userId,
                email: result.email,
                name: result.name
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            hideAuthOverlay();
            showUserInfo();
            await loadTransactions();
            
            showNotification(`Welcome back, ${result.name || 'User'}!`, 'success');
        } else {
            showNotification(result.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showNotification('Connection error. Please check your internet.', 'error');
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validations
    if (!name) {
        showNotification('Please enter your name', 'error');
        return;
    }
    
    if (name.length < 2) {
        showNotification('Name must be at least 2 characters', 'error');
        return;
    }
    
    if (!email) {
        showNotification('Please enter your email', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Please create a password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    showLoading('Creating your account...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'registerUser',
                name: name,
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            currentUser = {
                userId: result.userId,
                email: result.email,
                name: result.name
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            hideAuthOverlay();
            showUserInfo();
            updateUI();
            populateMonthFilter();
            
            showNotification(`Welcome, ${name}! Your account is ready.`, 'success');
        } else {
            showNotification(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Register error:', error);
        showNotification('Connection error. Please check your internet.', 'error');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        transactions = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('transactions');
        
        showAuthOverlay();
        showLoginForm();
        
        showNotification('Logged out successfully', 'success');
    }
}

function showUserInfo() {
    if (currentUser) {
        userNameEl.textContent = currentUser.name || 'User';
        userEmailEl.textContent = currentUser.email;
        userAvatarEl.textContent = (currentUser.name || currentUser.email || 'U')[0].toUpperCase();
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// DATA SYNC FUNCTIONS
// ============================================

async function loadTransactions() {
    if (!currentUser) return;
    
    if (!isOnline) {
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        updateUI();
        populateMonthFilter();
        showNotification('Offline - using cached data', 'error');
        return;
    }
    
    showSyncStatus('Loading...');
    
    try {
        const response = await fetch(`${API_URL}?action=getTransactions&userId=${currentUser.userId}`);
        const result = await response.json();
        
        if (result.success) {
            transactions = result.transactions || [];
            localStorage.setItem('transactions', JSON.stringify(transactions));
            updateUI();
            populateMonthFilter();
            showSyncStatus('Synced!', 'success');
            setTimeout(hideSyncStatus, 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Load error:', error);
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        updateUI();
        populateMonthFilter();
        showSyncStatus('Sync failed', 'error');
        setTimeout(hideSyncStatus, 2000);
    }
}

async function manualSync() {
    if (!currentUser) {
        showNotification('Please login to sync', 'error');
        return;
    }
    
    if (!isOnline) {
        showNotification('No internet connection', 'error');
        return;
    }
    
    await loadTransactions();
}

async function saveTransaction(transaction) {
    transactions.unshift(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateUI();
    populateMonthFilter();
    
    if (currentUser && isOnline) {
        showSyncStatus('Saving...');
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'addTransaction',
                    userId: currentUser.userId,
                    transaction: transaction
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSyncStatus('Saved!', 'success');
                setTimeout(hideSyncStatus, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            showSyncStatus('Will sync later', 'error');
            setTimeout(hideSyncStatus, 2000);
        }
    }
}

async function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateUI();
    populateMonthFilter();
    
    if (currentUser && isOnline) {
        showSyncStatus('Deleting...');
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'deleteTransaction',
                    userId: currentUser.userId,
                    transactionId: id
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSyncStatus('Deleted!', 'success');
                setTimeout(hideSyncStatus, 1500);
            }
        } catch (error) {
            console.error('Delete error:', error);
            showSyncStatus('Will sync later', 'error');
            setTimeout(hideSyncStatus, 2000);
        }
    }
}

// ============================================
// SYNC STATUS UI
// ============================================

function showSyncStatus(message, type = '') {
    const textEl = syncStatus.querySelector('.sync-text');
    const iconEl = syncStatus.querySelector('.sync-icon');
    
    textEl.textContent = message;
    syncStatus.className = 'sync-status active ' + type;
    
    if (type === '') {
        iconEl.textContent = '🔄';
    } else if (type === 'success') {
        iconEl.textContent = '✅';
    } else if (type === 'error') {
        iconEl.textContent = '❌';
    }
}

function hideSyncStatus() {
    syncStatus.classList.remove('active');
}

// ============================================
// ONLINE/OFFLINE HANDLERS
// ============================================

function handleOnline() {
    isOnline = true;
    offlineBanner.classList.remove('active');
    showNotification('Back online!', 'success');
    
    if (currentUser) {
        loadTransactions();
    }
}

function handleOffline() {
    isOnline = false;
    offlineBanner.classList.add('active');
}

// ============================================
// FORM HANDLERS
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const transaction = {
        id: Date.now(),
        description: document.getElementById('description').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };
    
    if (transaction.amount <= 0) {
        showNotification('Please enter a valid amount!', 'error');
        return;
    }
    
    await saveTransaction(transaction);
    
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    
    showNotification('Transaction added!', 'success');
}

function handleFilterClick() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    displayTransactions();
}

function handleKeydown(e) {
    if (e.key === 'Escape') {
        if (modalOverlay.classList.contains('active')) {
            closeModal();
        } else {
            searchInput.value = '';
            monthFilter.value = 'all';
            selectedMonthFilter = 'all';
            displayTransactions();
        }
    }
    
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportToCSV();
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateUI() {
    updateSummary();
    displayTransactions();
    updateMonthlyOverview();
    updateCategoryBreakdown();
}

function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const balance = income - expense;

    totalIncomeEl.textContent = '₹' + formatIndianNumber(income);
    totalExpenseEl.textContent = '₹' + formatIndianNumber(expense);
    balanceEl.textContent = '₹' + formatIndianNumber(balance);

    balanceEl.style.color = balance < 0 ? '#eb3349' : balance > 0 ? '#11998e' : '#333';
}

function populateMonthFilter() {
    const months = new Set();
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthYear);
    });

    const sortedMonths = Array.from(months).sort().reverse();
    
    monthFilter.innerHTML = '<option value="all">All Time</option>';
    sortedMonths.forEach(monthYear => {
        const [year, month] = monthYear.split('-');
        const monthName = fullMonthNames[parseInt(month) - 1];
        monthFilter.innerHTML += `<option value="${monthYear}">${monthName} ${year}</option>`;
    });
}

function filterByMonth() {
    selectedMonthFilter = monthFilter.value;
    displayTransactions();
}

function searchTransactions() {
    displayTransactions();
}

async function deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
        await removeTransaction(id);
        showNotification('Transaction deleted!', 'success');
    }
}

// ============================================
// MONTHLY OVERVIEW
// ============================================

function changeYear(delta) {
    selectedYear += delta;
    document.getElementById('selectedYear').textContent = selectedYear;
    updateMonthlyOverview();
}

function updateMonthlyOverview() {
    const monthlyData = getMonthlyData(selectedYear);
    renderMonthlyChart(monthlyData);
    renderMonthlyCards(monthlyData);
}

function getMonthlyData(year) {
    const data = [];
    
    for (let month = 0; month < 12; month++) {
        const monthTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

        data.push({
            month: monthNames[month],
            fullMonth: fullMonthNames[month],
            monthIndex: month,
            income,
            expense,
            balance: income - expense,
            transactionCount: monthTransactions.length
        });
    }

    return data;
}

function renderMonthlyChart(data) {
    const chartEl = document.getElementById('monthlyChart');
    const labelsEl = document.getElementById('chartLabels');
    
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    chartEl.innerHTML = data.map((d, index) => {
        const incomeHeight = (d.income / maxValue) * 100;
        const expenseHeight = (d.expense / maxValue) * 100;
        
        return `
            <div class="chart-bar-group" onclick="openMonthModal(${selectedYear}, ${index})">
                <div class="bar-container">
                    <div class="chart-bar income-bar" style="height: ${incomeHeight}%"></div>
                    <div class="chart-bar expense-bar" style="height: ${expenseHeight}%"></div>
                </div>
            </div>
        `;
    }).join('');

    labelsEl.innerHTML = data.map((d, index) => {
        const isCurrent = index === currentMonth && selectedYear === currentYear;
        return `<div class="chart-label ${isCurrent ? 'current-month' : ''}" onclick="openMonthModal(${selectedYear}, ${index})">${d.month}</div>`;
    }).join('');
}

function renderMonthlyCards(data) {
    const cardsEl = document.getElementById('monthlyCards');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    cardsEl.innerHTML = data.map((d, index) => {
        const isCurrent = index === currentMonth && selectedYear === currentYear;
        const hasData = d.transactionCount > 0;
        const balanceColor = d.balance >= 0 ? '#11998e' : '#eb3349';
        
        return `
            <div class="month-card ${isCurrent ? 'current' : ''} ${hasData ? 'has-data' : ''}" onclick="openMonthModal(${selectedYear}, ${index})">
                <div class="month-name">${d.month}</div>
                <div class="month-income">↑ ₹${formatIndianNumber(d.income)}</div>
                <div class="month-expense">↓ ₹${formatIndianNumber(d.expense)}</div>
                <div class="month-balance" style="color: ${isCurrent ? 'white' : balanceColor}">₹${formatIndianNumber(d.balance)}</div>
                <div class="month-transactions-count">${d.transactionCount} txns</div>
            </div>
        `;
    }).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openMonthModal(year, month) {
    currentModalMonth = month;
    currentModalYear = year;
    
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });

    if (monthTransactions.length === 0) {
        showNotification(`No transactions in ${fullMonthNames[month]} ${year}`, 'error');
        return;
    }

    document.getElementById('modalTitle').textContent = `📅 ${fullMonthNames[month]} ${year}`;
    
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = income - expense;
    
    renderModalSummary(income, expense, balance, monthTransactions.length);
    renderModalCategories('expense', monthTransactions);
    renderModalCategories('income', monthTransactions);
    renderPieChart('expense', monthTransactions);
    renderPieChart('income', monthTransactions);
    renderModalTransactions('expense', monthTransactions);
    renderModalTransactions('income', monthTransactions);
    renderModalTransactions('all', monthTransactions);
    renderDailyChart(year, month, monthTransactions);
    renderModalStats(monthTransactions, income, expense);
    
    switchModalTab('expenses');
    
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function renderModalSummary(income, expense, balance, count) {
    document.getElementById('modalSummary').innerHTML = `
        <div class="modal-summary-card income">
            <h4>Income</h4>
            <div class="value">₹${formatIndianNumber(income)}</div>
        </div>
        <div class="modal-summary-card expense">
            <h4>Expenses</h4>
            <div class="value">₹${formatIndianNumber(expense)}</div>
        </div>
        <div class="modal-summary-card balance">
            <h4>Balance</h4>
            <div class="value" style="color: ${balance >= 0 ? '#11998e' : '#eb3349'}">₹${formatIndianNumber(balance)}</div>
        </div>
        <div class="modal-summary-card transactions">
            <h4>Transactions</h4>
            <div class="value">${count}</div>
        </div>
    `;
}

function renderModalCategories(type, monthTransactions) {
    const filteredTransactions = monthTransactions.filter(t => t.type === type);
    const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const categoryTotals = {};
    filteredTransactions.forEach(t => {
        if (!categoryTotals[t.category]) categoryTotals[t.category] = { amount: 0, count: 0 };
        categoryTotals[t.category].amount += parseFloat(t.amount);
        categoryTotals[t.category].count++;
    });
    
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1].amount - a[1].amount);
    const containerId = type === 'expense' ? 'modalExpenseCategories' : 'modalIncomeCategories';
    
    if (sortedCategories.length === 0) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 25px;">
                <div class="empty-icon" style="font-size: 2.8em;">📭</div>
                <p>No ${type} transactions this month.</p>
            </div>
        `;
        return;
    }
    
    document.getElementById(containerId).innerHTML = sortedCategories.map(([category, data]) => {
        const percentage = total > 0 ? (data.amount / total * 100).toFixed(1) : 0;
        return `
            <div class="modal-category-card">
                <div class="modal-category-icon">${categoryIcons[category] || '📌'}</div>
                <div class="modal-category-info">
                    <div class="modal-category-name">${category}</div>
                    <div class="modal-category-amount ${type}">₹${formatIndianNumber(data.amount)}</div>
                    <div class="modal-category-details">${percentage}% • ${data.count} txn${data.count > 1 ? 's' : ''}</div>
                    <div class="modal-category-bar">
                        <div class="modal-category-bar-fill ${type}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPieChart(type, monthTransactions) {
    const filteredTransactions = monthTransactions.filter(t => t.type === type);
    const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const categoryTotals = {};
    filteredTransactions.forEach(t => {
        if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
        categoryTotals[t.category] += parseFloat(t.amount);
    });
    
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const containerId = type === 'expense' ? 'expensePieChart' : 'incomePieChart';
    
    if (sortedCategories.length === 0) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state" style="padding: 25px;">
                <div class="empty-icon" style="font-size: 2.8em;">📊</div>
                <p>No ${type} data.</p>
            </div>
        `;
        return;
    }
    
    let gradientParts = [];
    let currentAngle = 0;
    
    sortedCategories.forEach(([category, amount], index) => {
        const percentage = (amount / total) * 100;
        const color = categoryColors[index % categoryColors.length];
        gradientParts.push(`${color} ${currentAngle}% ${currentAngle + percentage}%`);
        currentAngle += percentage;
    });
    
    document.getElementById(containerId).innerHTML = `
        <div class="pie-chart" style="background: conic-gradient(${gradientParts.join(', ')})">
            <div class="pie-chart-center">
                <span class="total-label">Total</span>
                <span class="total-value">₹${formatIndianNumber(total)}</span>
            </div>
        </div>
        <div class="pie-legend">
            ${sortedCategories.slice(0, 5).map(([category, amount], index) => `
                <div class="pie-legend-item">
                    <span class="pie-legend-color" style="background: ${categoryColors[index % categoryColors.length]}"></span>
                    <span class="pie-legend-text">${categoryIcons[category] || '📌'} ${category}</span>
                    <span class="pie-legend-value">${(amount / total * 100).toFixed(1)}%</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderModalTransactions(type, monthTransactions) {
    let filteredTransactions = type === 'all' ? monthTransactions : monthTransactions.filter(t => t.type === type);
    const containerId = type === 'all' ? 'modalAllTransactions' : type === 'expense' ? 'modalExpenseTransactions' : 'modalIncomeTransactions';
    
    if (filteredTransactions.length === 0) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state" style="padding: 25px;">
                <div class="empty-icon" style="font-size: 2.8em;">📭</div>
                <p>No transactions found.</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    document.getElementById(containerId).innerHTML = sorted.map(t => `
        <div class="modal-transaction-item">
            <div class="modal-transaction-info">
                <div class="modal-transaction-desc">${categoryIcons[t.category] || '📌'} ${escapeHtml(t.description)}</div>
                <div class="modal-transaction-meta">${t.category} • ${formatDate(t.date)}</div>
            </div>
            <div class="modal-transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}₹${formatIndianNumber(parseFloat(t.amount))}
            </div>
        </div>
    `).join('');
}

function renderDailyChart(year, month, monthTransactions) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyData = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayTransactions = monthTransactions.filter(t => new Date(t.date).getDate() === day);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        dailyData.push({ day, expense, income });
    }
    
    const maxValue = Math.max(...dailyData.map(d => Math.max(d.expense, d.income)), 1);
    
    document.getElementById('dailyChart').innerHTML = `
        <div class="daily-chart-bars">
            ${dailyData.map(d => {
                const height = Math.max(d.expense, d.income) / maxValue * 100;
                return `<div class="daily-bar ${d.income > d.expense ? 'income-day' : ''}" style="height: ${height}%"></div>`;
            }).join('')}
        </div>
        <div class="daily-labels">
            <span class="daily-label">1</span>
            <span class="daily-label">${Math.ceil(daysInMonth / 4)}</span>
            <span class="daily-label">${Math.ceil(daysInMonth / 2)}</span>
            <span class="daily-label">${Math.ceil(daysInMonth * 3 / 4)}</span>
            <span class="daily-label">${daysInMonth}</span>
        </div>
    `;
}

function renderModalStats(monthTransactions, totalIncome, totalExpense) {
    const expenseTransactions = monthTransactions.filter(t => t.type === 'expense');
    const incomeTransactions = monthTransactions.filter(t => t.type === 'income');
    
    const avgExpense = expenseTransactions.length > 0 ? totalExpense / expenseTransactions.length : 0;
    const avgIncome = incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0;
    const maxExpense = expenseTransactions.length > 0 ? Math.max(...expenseTransactions.map(t => parseFloat(t.amount))) : 0;
    const maxIncome = incomeTransactions.length > 0 ? Math.max(...incomeTransactions.map(t => parseFloat(t.amount))) : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
    
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('modalStats').innerHTML = `
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-label">Avg Expense</div><div class="stat-value">₹${formatIndianNumber(avgExpense)}</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Avg Income</div><div class="stat-value">₹${formatIndianNumber(avgIncome)}</div></div>
        <div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-label">Max Expense</div><div class="stat-value">₹${formatIndianNumber(maxExpense)}</div></div>
        <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-label">Max Income</div><div class="stat-value">₹${formatIndianNumber(maxIncome)}</div></div>
        <div class="stat-card"><div class="stat-icon">💎</div><div class="stat-label">Savings Rate</div><div class="stat-value" style="color: ${savingsRate >= 0 ? '#11998e' : '#eb3349'}">${savingsRate}%</div></div>
        <div class="stat-card"><div class="stat-icon">${topCategory ? categoryIcons[topCategory[0]] || '📌' : '❓'}</div><div class="stat-label">Top Category</div><div class="stat-value">${topCategory ? topCategory[0] : 'N/A'}</div></div>
    `;
}

// ============================================
// CATEGORY BREAKDOWN
// ============================================

function updateCategoryBreakdown() {
    const currentDate = new Date();
    const monthExpenses = transactions.filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    });

    const categoryTotals = {};
    monthExpenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    });

    const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const breakdownEl = document.getElementById('categoryBreakdown');
    
    if (sortedCategories.length === 0) {
        breakdownEl.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 35px;">
                <div class="empty-icon">📊</div>
                <p>No expenses this month yet.</p>
            </div>
        `;
        return;
    }

    breakdownEl.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
        return `
            <div class="category-card">
                <div class="category-icon">${categoryIcons[category] || '📌'}</div>
                <div class="category-info">
                    <div class="category-name">${category}</div>
                    <div class="category-amount">₹${formatIndianNumber(amount)}</div>
                    <div class="category-percentage">${percentage}% of total</div>
                    <div class="category-bar"><div class="category-bar-fill" style="width: ${percentage}%"></div></div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// DISPLAY TRANSACTIONS
// ============================================

function displayTransactions() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    let filtered = [...transactions];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(t => t.type === currentFilter);
    }
    
    if (selectedMonthFilter !== 'all') {
        const [year, month] = selectedMonthFilter.split('-').map(Number);
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year && date.getMonth() === month - 1;
        });
    }
    
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.description.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        let message = 'No transactions yet. Add your first transaction!';
        if (currentFilter !== 'all') message = `No ${currentFilter} transactions found.`;
        if (searchTerm) message = `No results for "${searchTerm}".`;
        
        transactionList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>${message}</p>
            </div>
        `;
        return;
    }

    transactionList.innerHTML = filtered.map(t => `
        <div class="transaction-item ${t.type}-item">
            <div class="transaction-info">
                <div class="transaction-description">${escapeHtml(t.description)}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${categoryIcons[t.category] || '📌'} ${t.category}</span>
                    <span>📅 ${formatDate(t.date)}</span>
                </div>
            </div>
            <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${formatIndianNumber(parseFloat(t.amount))}</div>
            <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️</button>
        </div>
    `).join('');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToCSV() {
    if (transactions.length === 0) {
        showNotification('No transactions to export!', 'error');
        return;
    }

    let csv = 'Date,Description,Category,Type,Amount\n';
    transactions.forEach(t => {
        csv += `${t.date},"${t.description}",${t.category},${t.type},${t.amount}\n`;
    });

    downloadFile(csv, `expense_tracker_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotification('Data exported!', 'success');
}

function exportMonthToCSV() {
    if (currentModalMonth === null) return;
    
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === currentModalYear && date.getMonth() === currentModalMonth;
    });
    
    if (monthTransactions.length === 0) {
        showNotification('No transactions to export!', 'error');
        return;
    }
    
    let csv = 'Date,Description,Category,Type,Amount\n';
    monthTransactions.forEach(t => {
        csv += `${t.date},"${t.description}",${t.category},${t.type},${t.amount}\n`;
    });

    downloadFile(csv, `expenses_${fullMonthNames[currentModalMonth]}_${currentModalYear}.csv`, 'text/csv');
    showNotification('Month data exported!', 'success');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ============================================
// CLEAR DATA
// ============================================

async function clearAllData() {
    if (transactions.length === 0) {
        showNotification('No transactions to clear!', 'error');
        return;
    }
    
    if (!confirm('Delete ALL transactions? This cannot be undone!')) return;
    
    transactions = [];
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateUI();
    populateMonthFilter();
    
    if (currentUser && isOnline) {
        showSyncStatus('Clearing...');
        
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'clearAllTransactions',
                    userId: currentUser.userId
                })
            });
            showSyncStatus('Cleared!', 'success');
            setTimeout(hideSyncStatus, 1500);
        } catch (error) {
            console.error('Clear error:', error);
        }
    }
    
    showNotification('All transactions cleared!', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatIndianNumber(num) {
    if (isNaN(num)) num = 0;
    const isNegative = num < 0;
    num = Math.abs(num);
    
    let [intPart, decPart] = num.toFixed(2).split('.');
    let lastThree = intPart.slice(-3);
    let otherNumbers = intPart.slice(0, -3);
    
    if (otherNumbers !== '') lastThree = ',' + lastThree;
    
    let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return (isNegative ? '-' : '') + formatted + '.' + decPart;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
    }
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.35s ease reverse';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}
