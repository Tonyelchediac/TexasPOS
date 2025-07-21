// Global variables
let items = JSON.parse(localStorage.getItem('posItems')) || [];
let cart = [];
let salesData = JSON.parse(localStorage.getItem('posSalesData')) || {};
let selectedItemId = null;

// DOM elements
const mainContent = document.getElementById('mainContent');
const dashboardContent = document.getElementById('dashboardContent');
const pageTitle = document.getElementById('pageTitle');
const breadcrumb = document.getElementById('breadcrumb');
const currentDateElement = document.getElementById('currentDate');
const todayRevenue = document.getElementById('todayRevenue');
const todaySales = document.getElementById('todaySales');
const inventoryCount = document.getElementById('inventoryCount');
const recentTransactions = document.getElementById('recentTransactions');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    updateDashboardStats();
    loadPage('dashboard');
    setupNavButtons();
});

// Update current date display
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Update dashboard statistics
function updateDashboardStats() {
    const today = getTodayDateKey();
    const todaySalesData = salesData[today] || { items: {}, total: 0 };
    
    // Update revenue in L.L
    todayRevenue.textContent = `${todaySalesData.total.toLocaleString('en-US')} L.L`;
    
    // Update sales count
    const salesCount = Object.values(todaySalesData.items).reduce((sum, item) => sum + item.quantity, 0);
    todaySales.textContent = salesCount;
    
    // Update inventory count
    inventoryCount.textContent = items.length;
    
    // Update recent transactions
    updateRecentTransactions();
}

// Update recent transactions list
function updateRecentTransactions() {
    const today = getTodayDateKey();
    const todaySalesData = salesData[today] || { items: {} };
    
    if (Object.keys(todaySalesData.items).length === 0) {
        recentTransactions.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No recent transactions</p>
            </div>
        `;
        return;
    }
    
    const sortedItems = Object.values(todaySalesData.items)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    
    recentTransactions.innerHTML = sortedItems.map(item => `
        <div class="transaction-item">
            <div class="transaction-info">
                <span class="transaction-name">${item.name}</span>
                <span class="transaction-meta">${item.quantity} × ${item.price.toLocaleString('en-US')} L.L</span>
            </div>
            <div class="transaction-amount">${item.total.toLocaleString('en-US')} L.L</div>
        </div>
    `).join('');
}

// Add this new function for password protection with custom modal
function checkInventoryPassword() {
    return new Promise((resolve) => {
        // Create password modal
        const passwordModal = document.createElement('div');
        passwordModal.className = 'password-modal';
        passwordModal.innerHTML = `
            <div class="password-modal-content">
                <div class="password-modal-header">
                    <h3>Access Restricted</h3>
                    <i class="fas fa-lock"></i>
                </div>
                <div class="password-modal-body">
                    <p>Enter password to access Inventory Management:</p>
                    <input type="password" id="inventoryPassword" placeholder="Enter password" maxlength="20">
                    <div class="password-error" id="passwordError" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Incorrect password. Please try again.</span>
                    </div>
                </div>
                <div class="password-modal-actions">
                    <button class="password-btn cancel" onclick="closePasswordModal(false)">Cancel</button>
                    <button class="password-btn confirm" onclick="verifyPassword()">Access</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(passwordModal);
        document.getElementById('inventoryPassword').focus();
        
        // Store resolve function globally for access from other functions
        window.passwordResolve = resolve;
        
        // Add enter key listener
        document.getElementById('inventoryPassword').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPassword();
            }
        });
    });
}

// Add password verification function
function verifyPassword() {
    const password = document.getElementById('inventoryPassword').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (password === 'TEXAS') {
        closePasswordModal(true);
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('inventoryPassword').value = '';
        document.getElementById('inventoryPassword').focus();
    }
}

// Add function to close password modal
function closePasswordModal(success) {
    const modal = document.querySelector('.password-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    if (window.passwordResolve) {
        window.passwordResolve(success);
        delete window.passwordResolve;
    }
}

// Update the loadPage function to be async and include password check
async function loadPage(page) {
    // Check password for settings/inventory page
    if (page === 'settings') {
        const hasAccess = await checkInventoryPassword();
        if (!hasAccess) {
            return; // Don't load the page if password is incorrect
        }
    }
    
    // Update active nav button
    setupNavButtons(page);
    
    // Update page title and breadcrumb
    updatePageHeader(page);
    
    // Load page content
    switch(page) {
        case 'dashboard':
            renderDashboardPage();
            break;
        case 'pos':
            renderPosPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
        case 'data':
            renderDataPage();
            break;
    }
}

// Update active nav button
function setupNavButtons(activePage) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.classList.remove('active');
        
        const pageMap = {
            'dashboard': 0,
            'pos': 1,
            'settings': 2,
            'data': 3
        };
        
        if (activePage && button === navButtons[pageMap[activePage]]) {
            button.classList.add('active');
        }
    });
}

// Update page header
function updatePageHeader(page) {
    const pageTitles = {
        'dashboard': 'Dashboard',
        'pos': 'Point of Sale',
        'settings': 'Inventory Management',
        'data': 'Sales Analytics'
    };
    
    const breadcrumbs = {
        'dashboard': 'Home',
        'pos': 'Home / Point of Sale',
        'settings': 'Home / Inventory',
        'data': 'Home / Analytics'
    };
    
    pageTitle.textContent = pageTitles[page] || 'Dashboard';
    breadcrumb.textContent = breadcrumbs[page] || 'Home';
}

// Dashboard Page
function renderDashboardPage() {
    dashboardContent.style.display = 'block';
    mainContent.querySelector('.content-area').innerHTML = '';
    mainContent.querySelector('.content-area').appendChild(dashboardContent);
    updateDashboardStats();
}

// POS Page
function renderPosPage() {
    const contentArea = mainContent.querySelector('.content-area');
    contentArea.innerHTML = '';
    dashboardContent.style.display = 'none';
    
    contentArea.innerHTML = `
        <div class="pos-container">
            <div class="items-section">
                <h2>Available Items</h2>
                <div class="currency-info">
                    <small>Prices shown in Lebanese Pounds (L.L)</small>
                </div>
                <div class="items-grid" id="itemsGrid"></div>
            </div>
            <div class="receipt-section">
                <div class="receipt-header">
                    <h2>Order Receipt</h2>
                </div>
                <div class="receipt-items" id="receiptItems"></div>
                <div class="receipt-total">
                    <span>Total:</span>
                    <span id="receiptTotal">0 L.L</span>
                </div>
                <div class="receipt-actions">
                    <button class="receipt-btn clear" onclick="clearCart()">
                        <i class="fas fa-trash-alt"></i>
                        <span>Clear</span>
                    </button>
                    <button class="receipt-btn complete" onclick="completeSale()">
                        <i class="fas fa-check-circle"></i>
                        <span>Complete Sale</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    renderItemsGrid();
    renderReceipt();
}

function renderItemsGrid() {
    const itemsGrid = document.getElementById('itemsGrid');
    itemsGrid.innerHTML = '';

    if (items.length === 0) {
        itemsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1">
                <i class="fas fa-box-open"></i>
                <p>No items available</p>
                <button class="form-btn add" onclick="loadPage('settings')">
                    <i class="fas fa-plus"></i>
                    <span>Add Items</span>
                </button>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price.toLocaleString('en-US')} L.L</div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
        `;
        itemCard.addEventListener('click', () => addToCart(item));
        itemsGrid.appendChild(itemCard);
    });
}

function addToCart(item) {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...item,
            quantity: 1
        });
    }
    
    renderReceipt();
}

function renderReceipt() {
    const receiptItems = document.getElementById('receiptItems');
    const receiptTotal = document.getElementById('receiptTotal');
    
    if (!receiptItems) return;
    
    receiptItems.innerHTML = '';
    
    if (cart.length === 0) {
        receiptItems.innerHTML = `
            <div class="empty-state" style="padding: 2rem 0">
                <i class="fas fa-shopping-cart"></i>
                <p>Cart is empty</p>
            </div>
        `;
        receiptTotal.textContent = '0 L.L';
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'receipt-item';
        itemElement.innerHTML = `
            <div class="receipt-item-info">
                <div class="receipt-item-name">${item.name}</div>
                <div class="receipt-item-price">${item.price.toLocaleString('en-US')} L.L each</div>
            </div>
            <div class="receipt-item-controls">
                <div class="quantity-control">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="receipt-item-total">${itemTotal.toLocaleString('en-US')} L.L</div>
        `;
        
        receiptItems.appendChild(itemElement);
    });
    
    receiptTotal.textContent = `${total.toLocaleString('en-US')} L.L`;
}

function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== itemId);
            showToast('Item removed from cart');
        }
    }
    
    renderReceipt();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    renderReceipt();
    showToast('Item removed from cart');
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        renderReceipt();
        showToast('Cart cleared');
    }
}

// Add this function to handle the payment process
function completeSale() {
    if (cart.length === 0) {
        showToast('No items in cart', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const paymentModal = document.createElement('div');
    paymentModal.className = 'payment-modal';
    paymentModal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <h3>Complete Payment</h3>
                <button class="close-btn" onclick="closePaymentModal()">&times;</button>
            </div>
            <div class="payment-details">
                <div class="payment-row">
                    <span>Total Amount:</span>
                    <span>${total.toLocaleString('en-US')} L.L</span>
                </div>
                <div class="payment-row">
                    <label for="amountReceived">Amount Received (L.L):</label>
                    <input type="number" id="amountReceived" placeholder="0" min="0" step="1000" oninput="calculateChange()">
                </div>
                <div class="payment-row highlight">
                    <span>Change Due:</span>
                    <span id="changeAmount">0 L.L</span>
                </div>
            </div>
            <div class="payment-actions">
                <button class="payment-btn cancel" onclick="closePaymentModal()">Cancel</button>
                <button class="payment-btn confirm" onclick="processPayment()" disabled id="confirmPaymentBtn">
                    <i class="fas fa-check-circle"></i> Confirm Payment
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);

    const input = document.getElementById('amountReceived');
    input.focus();

    // Add keydown listener for Enter key
    function handleEnterKey(e) {
        if (e.key === 'Enter') {
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            if (confirmBtn && !confirmBtn.disabled) {
                processPayment();
            }
        }
    }

    document.addEventListener('keydown', handleEnterKey);

    // Remove the event listener when modal closes
    paymentModal.dataset.listener = true;
    paymentModal._handleEnterKey = handleEnterKey;
}


function calculateChange() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = amountReceived - total;
    const changeAmount = document.getElementById('changeAmount');
    const confirmBtn = document.getElementById('confirmPaymentBtn');

    changeAmount.textContent = `${Math.max(0, change).toLocaleString('en-US')} L.L`;
    
    if (amountReceived >= total) {
        changeAmount.style.color = '#2ecc71'; // Green
        confirmBtn.disabled = false;
    } else {
        changeAmount.style.color = '#e74c3c'; // Red
        confirmBtn.disabled = true;
    }
}

function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        if (modal.dataset.listener && typeof modal._handleEnterKey === 'function') {
            document.removeEventListener('keydown', modal._handleEnterKey);
        }
        document.body.removeChild(modal);
    }
}


function processPayment() {
    const today = getTodayDateKey();

    
    // Initialize today's sales if not exists
    if (!salesData[today]) {
        salesData[today] = {
            items: {},
            total: 0
        };
    }
    
    let saleTotal = 0;
    
    // Update sales data
    cart.forEach(item => {
        saleTotal += item.price * item.quantity;
        
        if (salesData[today].items[item.id]) {
            salesData[today].items[item.id].quantity += item.quantity;
            salesData[today].items[item.id].total += item.price * item.quantity;
        } else {
            salesData[today].items[item.id] = {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            };
        }
    });
    
    salesData[today].total += saleTotal;
    
    // Save to local storage
    localStorage.setItem('posSalesData', JSON.stringify(salesData));
    
    // Print receipt
    printReceipt();
    
    // Clear cart
    cart = [];
    renderReceipt();
    
    // Close payment modal
    closePaymentModal();
    
    // Update dashboard stats
    updateDashboardStats();
    
    showToast('Payment processed successfully!', 'success');
}

function printReceipt() {
    let receiptText = `=== NEXUS POS RECEIPT ===\n`;
    receiptText += `Date: ${new Date().toLocaleString()}\n`;
    receiptText += `----------------------------\n\n`;
    
    cart.forEach(item => {
        receiptText += `${item.name} x${item.quantity} @ ${item.price.toLocaleString('en-US')} L.L = ${(item.price * item.quantity).toLocaleString('en-US')} L.L\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    receiptText += `\n----------------------------\n`;
    receiptText += `SUBTOTAL: ${total.toLocaleString('en-US')} L.L\n`;
    receiptText += `TAX: 0 L.L\n`;
    receiptText += `TOTAL: ${total.toLocaleString('en-US')} L.L\n\n`;
    receiptText += `Thank you for your purchase!\n`;
    receiptText += `=== END OF RECEIPT ===\n`;
    
    console.log(receiptText); // In a real app, you would send this to a printer
    
    // Add to recent transactions
    updateRecentTransactions();
}

// Settings Page
function renderSettingsPage() {
    const contentArea = mainContent.querySelector('.content-area');
    contentArea.innerHTML = '';
    dashboardContent.style.display = 'none';
    
    contentArea.innerHTML = `
        <div class="settings-container">
            <h2>Inventory Management</h2>
            <div class="form-grid">
                <div class="form-group">
                    <label for="itemName">Item Name</label>
                    <input type="text" id="itemName" class="form-control" placeholder="Enter item name">
                </div>
                <div class="form-group">
                    <label for="itemDescription">Description</label>
                    <input type="text" id="itemDescription" class="form-control" placeholder="Enter item description">
                </div>
                <div class="form-group">
                    <label for="itemPrice">Price (L.L)</label>
                    <input type="number" id="itemPrice" class="form-control" placeholder="0" min="0" step="1000">
                    <small class="price-helper">Enter price in Lebanese Pounds (L.L)</small>
                </div>
            </div>
            <div class="form-actions">
                <button class="form-btn add" onclick="addItem()">
                    <i class="fas fa-plus"></i>
                    <span>Add Item</span>
                </button>
                <button class="form-btn update" onclick="updateItem()">
                    <i class="fas fa-sync"></i>
                    <span>Update Item</span>
                </button>
                <button class="form-btn delete" onclick="deleteItem()">
                    <i class="fas fa-trash"></i>
                    <span>Delete Item</span>
                </button>
            </div>
            <div class="inventory-list">
                <div class="inventory-header">
                    <div>Name</div>
                    <div>Description</div>
                    <div>Price (L.L)</div>
                    <div>Actions</div>
                </div>
                <div class="inventory-content" id="inventoryContent"></div>
            </div>
        </div>
    `;
    
    renderItemsList();
}

function renderItemsList() {
    const inventoryContent = document.getElementById('inventoryContent');
    inventoryContent.innerHTML = '';

    if (items.length === 0) {
        inventoryContent.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem 0">
                <i class="fas fa-box-open"></i>
                <p>No inventory items found</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'inventory-item';
        itemRow.innerHTML = `
            <div class="inventory-name">${item.name}</div>
            <div class="inventory-description">${item.description || '-'}</div>
            <div class="inventory-price">${item.price.toLocaleString('en-US')} L.L</div>
            <div class="inventory-actions">
                <button class="inventory-btn edit" onclick="selectItem('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="inventory-btn delete" onclick="confirmDeleteItem('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        inventoryContent.appendChild(itemRow);
    });
}

function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);

    if (!name || isNaN(price) || price <= 0) {
        showToast('Please enter valid item name and price', 'error');
        return;
    }

    const newItem = {
        id: generateId(),
        name,
        description,
        price // Store price directly in L.L
    };

    items.push(newItem);
    saveItems();
    clearItemForm();
    renderItemsList();
    showToast('Item added successfully', 'success');
    
    // Update dashboard stats
    updateDashboardStats();
    
    // If on POS page, refresh the items grid
    if (document.getElementById('itemsGrid')) {
        renderItemsGrid();
    }
}

function updateItem() {
    if (!selectedItemId) {
        showToast('Please select an item to update', 'error');
        return;
    }

    const name = document.getElementById('itemName').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);

    if (!name || isNaN(price) || price <= 0) {
        showToast('Please enter valid item name and price', 'error');
        return;
    }

    const itemIndex = items.findIndex(item => item.id === selectedItemId);
    if (itemIndex !== -1) {
        items[itemIndex] = {
            id: selectedItemId,
            name,
            description,
            price
        };
        saveItems();
        clearItemForm();
        renderItemsList();
        showToast('Item updated successfully', 'success');
        
        // If on POS page, refresh the items grid and cart
        if (document.getElementById('itemsGrid')) {
            renderItemsGrid();
            
            // Update cart if this item is in it
            const cartItemIndex = cart.findIndex(item => item.id === selectedItemId);
            if (cartItemIndex !== -1) {
                cart[cartItemIndex] = {
                    ...cart[cartItemIndex],
                    name,
                    price
                };
                renderReceipt();
            }
        }
    }
}

function confirmDeleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        deleteItem(itemId);
    }
}

function deleteItem(itemId = null) {
    const itemToDelete = itemId || selectedItemId;
    
    if (!itemToDelete) {
        showToast('Please select an item to delete', 'error');
        return;
    }

    items = items.filter(item => item.id !== itemToDelete);
    saveItems();
    
    // Remove from cart if it's there
    cart = cart.filter(item => item.id !== itemToDelete);
    if (document.getElementById('receiptItems')) {
        renderReceipt();
    }
    
    clearItemForm();
    renderItemsList();
    showToast('Item deleted successfully', 'success');
    
    // Update dashboard stats
    updateDashboardStats();
    
    // If on POS page, refresh the items grid
    if (document.getElementById('itemsGrid')) {
        renderItemsGrid();
    }
}

function selectItem(itemId) {
    const item = items.find(item => item.id === itemId);
    if (item) {
        selectedItemId = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemName').dataset.itemId = item.id;
        document.getElementById('itemDescription').value = item.description || '';
        document.getElementById('itemPrice').value = item.price;
        
        // Scroll to form
        document.getElementById('itemName').focus();
    }
}

function clearItemForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemName').dataset.itemId = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemPrice').value = '';
    selectedItemId = null;
}

function saveItems() {
    localStorage.setItem('posItems', JSON.stringify(items));
}

// Data Page
function renderDataPage() {
    const contentArea = mainContent.querySelector('.content-area');
    contentArea.innerHTML = '';
    dashboardContent.style.display = 'none';
    
    const today = getTodayDateKey();
    const todaySalesData = salesData[today] || { items: {}, total: 0 };
    const sortedItems = Object.values(todaySalesData.items).sort((a, b) => b.quantity - a.quantity);
    const totalItemsSold = Object.values(todaySalesData.items).reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItemsSold = Object.keys(todaySalesData.items).length;
    
    contentArea.innerHTML = `
        <div class="data-container">
            <h2>Sales Analytics - ${formatDateDisplay(today)}</h2>
            
            <div class="stats-summary">
                <div class="data-stat-card">
                    <h3>Total Items Sold</h3>
                    <p>${totalItemsSold}</p>
                </div>
                <div class="data-stat-card">
                    <h3>Total Revenue</h3>
                    <p>${todaySalesData.total.toLocaleString('en-US')} L.L</p>
                </div>
                <div class="data-stat-card">
                    <h3>Unique Items Sold</h3>
                    <p>${uniqueItemsSold}</p>
                </div>
            </div>
            
            <h3>Item Sales</h3>
            <div class="sales-table-container">
                <table class="sales-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Price (L.L)</th>
                            <th>Quantity</th>
                            <th>Total (L.L)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedItems.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.price.toLocaleString('en-US')} L.L</td>
                                <td>${item.quantity}</td>
                                <td class="highlight">${item.total.toLocaleString('en-US')} L.L</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>Total</strong></td>
                            <td class="highlight"><strong>${todaySalesData.total.toLocaleString('en-US')} L.L</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="data-actions">
                <button class="data-btn export" onclick="downloadSalesData()">
                    <i class="fas fa-file-export"></i>
                    <span>Export Data</span>
                </button>
            </div>
        </div>
    `;
}

function downloadSalesData() {
    const today = getTodayDateKey();
    const todaySalesData = salesData[today] || { items: {}, total: 0 };
    const sortedItems = Object.values(todaySalesData.items).sort((a, b) => b.quantity - a.quantity);
    const totalItemsSold = Object.values(todaySalesData.items).reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItemsSold = Object.keys(todaySalesData.items).length;
    const totalRevenueLBP = convertToLBP(todaySalesData.total);

    let dataText = `TEXAS POS SALES REPORT - ${formatDateDisplay(today)}\n\n`;
    dataText += `GENERATED ON: ${new Date().toLocaleString()}\n`;
    dataText += `----------------------------------------\n\n`;
    dataText += `SUMMARY\n`;
    dataText += `Total Items Sold: ${totalItemsSold}\n`;
    dataText += `Total Revenue: ${totalRevenueLBP.toLocaleString('en-US')} L.L\n`;
    dataText += `Unique Items Sold: ${uniqueItemsSold}\n\n`;
    
    dataText += `ITEMIZED SALES\n`;
    dataText += `----------------------------------------\n`;
    dataText += `Item\t\tPrice (L.L)\tQty\tTotal (L.L)\n`;
    dataText += `----------------------------------------\n`;
    
    sortedItems.forEach(item => {
        const lbpPrice = convertToLBP(item.price);
        const lbpTotal = convertToLBP(item.total);
        dataText += `${item.name}\t${lbpPrice.toLocaleString('en-US')} L.L\t${item.quantity}\t${lbpTotal.toLocaleString('en-US')} L.L\n`;
    });
    
    dataText += `----------------------------------------\n`;
    dataText += `TOTAL\t\t\t${totalRevenueLBP.toLocaleString('en-US')} L.L\n\n`;

    const filename = `${today}_Sales_Report.txt`;
    const blob = new Blob([dataText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Report downloaded successfully', 'success');
}

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDateKey() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    return `${day}${month}${year}`;
}

function formatDateDisplay(dateKey) {
    const day = dateKey.substring(0, 2);
    const month = dateKey.substring(2, 5);
    const year = dateKey.substring(5);
    return `${day} ${month} ${year}`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function finishActivity() {
    if (confirm('Are you sure you want to end this session? This will clear all current data except saved inventory items.')) {
        // Clear current session data but keep inventory items
        cart = [];
        selectedItemId = null;
        
        // Clear sales data from memory and localStorage
        salesData = {};
        localStorage.removeItem('posSalesData');
        
        // Reset dashboard stats to zero
        todayRevenue.textContent = '0 L.L';
        todaySales.textContent = '0';
        inventoryCount.textContent = items.length; // Keep inventory count
        
        // Clear recent transactions display
        recentTransactions.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No recent transactions</p>
            </div>
        `;
        
        // Clear any forms if on settings page
        const itemNameField = document.getElementById('itemName');
        const itemDescField = document.getElementById('itemDescription');
        const itemPriceField = document.getElementById('itemPrice');
        
        if (itemNameField) itemNameField.value = '';
        if (itemDescField) itemDescField.value = '';
        if (itemPriceField) itemPriceField.value = '';
        
        // Clear receipt if on POS page
        const receiptItems = document.getElementById('receiptItems');
        const receiptTotal = document.getElementById('receiptTotal');
        
        if (receiptItems) {
            receiptItems.innerHTML = `
                <div class="empty-state" style="padding: 2rem 0">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Cart is empty</p>
                </div>
            `;
        }
        
        if (receiptTotal) {
            receiptTotal.textContent = '$0.00';
        }
        
        // Close any open modals
        const paymentModal = document.querySelector('.payment-modal');
        if (paymentModal) {
            document.body.removeChild(paymentModal);
        }
        
        // Navigate back to dashboard
        loadPage('dashboard');
        
        // Show success message
        showToast('Session ended successfully. Inventory items preserved.', 'success');
        
        // Update current date
        updateCurrentDate();
    }
}

// Add toast and payment modal styles to the head
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: var(--border-radius-md);
            background-color: var(--gray-800);
            color: white;
            box-shadow: var(--shadow-lg);
            transform: translateY(100px);
            opacity: 0;
            transition: var(--transition-normal);
            z-index: 1000;
        }
        
        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-info {
            background-color: var(--primary);
        }
        
        .toast-success {
            background-color: var(--success);
        }
        
        .toast-error {
            background-color: var(--danger);
        }

        /* Password Modal Styles */
        .password-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
        }

        .password-modal-content {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        .password-modal-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            color: #e74c3c;
        }

        .password-modal-header h3 {
            margin: 0;
            font-size: 1.25rem;
        }

        .password-modal-body p {
            margin-bottom: 1rem;
            color: #666;
        }

        .password-modal-body input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            text-align: center;
            margin-bottom: 1rem;
        }

        .password-modal-body input:focus {
            outline: none;
            border-color: var(--primary);
        }

        .password-error {
            background-color: #fee;
            color: #e74c3c;
            padding: 0.5rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-size: 0.9rem;
        }

        .password-modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 1.5rem;
        }

        .password-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            min-width: 100px;
        }

        .password-btn.cancel {
            background-color: #95a5a6;
            color: white;
        }

        .password-btn.cancel:hover {
            background-color: #7f8c8d;
        }

        .password-btn.confirm {
            background-color: var(--primary-dark);
            color: white;
        }

        .password-btn.confirm:hover {
            background-color: #2980b9;
        }

        /* Payment Modal Styles */
        .payment-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .payment-modal-content {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .payment-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid #eee;
            padding-bottom: 1rem;
        }

        .payment-modal-header h3 {
            margin: 0;
            color: #333;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-btn:hover {
            color: #333;
        }

        .payment-details {
            margin-bottom: 2rem;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.5rem 0;
        }

        .payment-row.highlight {
            font-weight: bold;
            font-size: 1.1rem;
            border-top: 1px solid #eee;
            padding-top: 1rem;
        }

        .payment-row label {
            font-weight: 500;
        }

        .payment-row input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 120px;
            text-align: right;
        }

        .payment-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }

        .payment-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
        }

        .payment-btn.cancel {
            background-color: #6c757d;
            color: white;
        }

        .payment-btn.cancel:hover {
            background-color: #5a6268;
        }

        .payment-btn.confirm {
            background-color: #28a745;
            color: white;
        }

        .payment-btn.confirm:hover:not(:disabled) {
            background-color: #218838;
        }

        .payment-btn.confirm:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
            opacity: 0.6;
        }
    </style>
`);