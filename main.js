        // POS System Class
        class POSSystem {
            constructor() {
                this.cart = [];
                this.products = [];
                this.sales = [];
                this.settings = {
                    storeName: 'TexasPOS',
                    taxRate: 10,
                    currency: '$'
                };
                this.selectedPaymentMethod = 'cash';
                this.currentCategory = 'All';
                this.systemPassword = '1234'; // Default password
                this.isDataExported = false;
                this.pendingAction = null;
                
                this.init();
            }

            init() {
                this.loadData();
                this.initializeDefaultProducts();
                this.setupEventListeners();
                this.renderProducts();
                this.renderCategories();
                this.updateTime();
                setInterval(() => this.updateTime(), 1000);
            }

            loadData() {
                const savedProducts = localStorage.getItem('pos_products');
                const savedSales = localStorage.getItem('pos_sales');
                const savedSettings = localStorage.getItem('pos_settings');

                if (savedProducts) {
                    this.products = JSON.parse(savedProducts);
                }
                if (savedSales) {
                    this.sales = JSON.parse(savedSales);
                }
                if (savedSettings) {
                    this.settings = JSON.parse(savedSettings);
                }
            }

            saveData() {
                localStorage.setItem('pos_products', JSON.stringify(this.products));
                localStorage.setItem('pos_sales', JSON.stringify(this.sales));
                localStorage.setItem('pos_settings', JSON.stringify(this.settings));
            }

            initializeDefaultProducts() {
                if (this.products.length === 0) {
                    this.products = [];
                    this.saveData();
                }
            }

            setupEventListeners() {
                // Navigation
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        const view = e.currentTarget.dataset.view;
                        this.switchView(view);
                    });
                });

                // Search
                document.getElementById('searchInput').addEventListener('input', (e) => {
                    this.searchProducts(e.target.value);
                });

                // Cart actions
                document.getElementById('clearCart').addEventListener('click', () => this.clearCart());
                document.getElementById('checkoutBtn').addEventListener('click', () => this.openCheckout());

                // Product modal
                document.getElementById('addProductBtn').addEventListener('click', () => this.openProductModal());
                document.getElementById('cancelProductBtn').addEventListener('click', () => this.closeProductModal());
                document.getElementById('productForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveProduct();
                });

                // Checkout
                document.querySelectorAll('.payment-method').forEach(method => {
                    method.addEventListener('click', (e) => {
                        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
                        e.currentTarget.classList.add('active');
                        this.selectedPaymentMethod = e.currentTarget.dataset.method;
                    });
                });

                document.getElementById('amountPaid').addEventListener('input', (e) => {
                    this.calculateChange(parseFloat(e.target.value) || 0);
                });

                document.getElementById('cancelCheckoutBtn').addEventListener('click', () => this.closeCheckout());
                document.getElementById('completeCheckoutBtn').addEventListener('click', () => this.completeSale());

                // Receipt
                document.getElementById('closeReceiptBtn').addEventListener('click', () => this.closeReceipt());
                document.getElementById('printReceiptBtn').addEventListener('click', () => this.printReceipt());

                // Settings
                document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
                document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
                document.getElementById('importDataBtn').addEventListener('click', () => {
                    document.getElementById('importFileInput').click();
                });
                document.getElementById('importFileInput').addEventListener('change', (e) => this.importData(e));
                document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());
                document.getElementById('exportDailyTxtBtn').addEventListener('click', () => this.exportDailyItemsTxt());
                document.getElementById('endSessionBtn').addEventListener('click', () => this.endSession());

                // Password Modal
                document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.closePasswordModal());
                document.getElementById('confirmPasswordBtn').addEventListener('click', () => this.verifyPassword());
                document.getElementById('systemPasswordInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.verifyPassword();
                });

                // Alert Modal
                document.getElementById('alertOkBtn').addEventListener('click', () => this.closeAlert());
                document.getElementById('confirmCancelBtn').addEventListener('click', () => this.closeAlert());
                document.getElementById('confirmOkBtn').addEventListener('click', () => this.handleConfirm());
            }

            switchView(viewName) {
                if (viewName === 'inventory') {
                    this.requirePassword(() => this.executeSwitchView(viewName));
                    return;
                }
                this.executeSwitchView(viewName);
            }

            executeSwitchView(viewName) {
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
                
                document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
                document.getElementById(`${viewName}View`).classList.add('active');

                if (viewName === 'inventory') {
                    this.renderInventory();
                } else if (viewName === 'sales') {
                    this.renderSalesHistory();
                } else if (viewName === 'settings') {
                    this.loadSettings();
                }
            }

            renderCategories() {
                const categories = ['All', ...new Set(this.products.map(p => p.category))];
                const container = document.getElementById('categories');
                
                container.innerHTML = categories.map(cat => `
                    <div class="category-chip ${cat === this.currentCategory ? 'active' : ''}" 
                         onclick="pos.filterByCategory('${cat}')">
                        ${cat}
                    </div>
                `).join('');
            }

            filterByCategory(category) {
                this.currentCategory = category;
                this.renderProducts();
                this.renderCategories();
            }

            renderProducts() {
                const filteredProducts = this.currentCategory === 'All' 
                    ? this.products 
                    : this.products.filter(p => p.category === this.currentCategory);

                const grid = document.getElementById('productsGrid');
                grid.innerHTML = filteredProducts.map(product => `
                    <div class="product-card" onclick="pos.addToCart(${product.id})">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">${this.settings.currency}${product.price.toFixed(2)}</div>
                        <div class="product-stock">Stock: ${product.stock}</div>
                    </div>
                `).join('');
            }

            searchProducts(query) {
                if (!query) {
                    this.currentCategory = 'All';
                    this.renderProducts();
                    this.renderCategories();
                    return;
                }

                const filtered = this.products.filter(p => 
                    p.name.toLowerCase().includes(query.toLowerCase()) ||
                    p.category.toLowerCase().includes(query.toLowerCase())
                );

                const grid = document.getElementById('productsGrid');
                grid.innerHTML = filtered.map(product => `
                    <div class="product-card" onclick="pos.addToCart(${product.id})">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">${this.settings.currency}${product.price.toFixed(2)}</div>
                        <div class="product-stock">Stock: ${product.stock}</div>
                    </div>
                `).join('');
            }

            addToCart(productId) {
                const product = this.products.find(p => p.id === productId);
                if (!product || product.stock === 0) {
                    this.showAlert('Product out of stock!', 'warning');
                    return;
                }

                const cartItem = this.cart.find(item => item.id === productId);
                if (cartItem) {
                    if (cartItem.quantity < product.stock) {
                        cartItem.quantity++;
                    } else {
                        this.showAlert('Not enough stock!', 'warning');
                        return;
                    }
                } else {
                    this.cart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                    });
                }

                this.renderCart();
            }

            removeFromCart(productId) {
                this.cart = this.cart.filter(item => item.id !== productId);
                this.renderCart();
            }

            updateQuantity(productId, change) {
                const cartItem = this.cart.find(item => item.id === productId);
                const product = this.products.find(p => p.id === productId);
                
                if (cartItem) {
                    const newQty = cartItem.quantity + change;
                    if (newQty > 0 && newQty <= product.stock) {
                        cartItem.quantity = newQty;
                    } else if (newQty <= 0) {
                        this.removeFromCart(productId);
                    } else {
                        this.showAlert('Not enough stock!', 'warning');
                    }
                }

                this.renderCart();
            }

            renderCart() {
                const container = document.getElementById('cartItems');
                const summary = document.getElementById('cartSummary');
                const checkoutBtn = document.getElementById('checkoutBtn');

                if (this.cart.length === 0) {
                    container.innerHTML = `
                        <div class="cart-empty">
                            <div class="cart-empty-icon"><i class="fas fa-cart-shopping"></i></div>
                            <div>Cart is empty</div>
                            <div style="font-size: 14px; margin-top: 8px;">Add products to get started</div>
                        </div>
                    `;
                    summary.style.display = 'none';
                    checkoutBtn.disabled = true;
                    return;
                }

                container.innerHTML = this.cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price">${this.settings.currency}${item.price.toFixed(2)} x ${item.quantity}</div>
                            <div class="cart-item-controls">
                                <button class="qty-btn" onclick="pos.updateQuantity(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="qty-btn" onclick="pos.updateQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                                <button class="remove-btn" onclick="pos.removeFromCart(${item.id})">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

                const subtotal = this.calculateSubtotal();
                const tax = subtotal * (this.settings.taxRate / 100);
                const total = subtotal + tax;

                document.getElementById('subtotal').textContent = `${this.settings.currency}${subtotal.toFixed(2)}`;
                document.getElementById('tax').textContent = `${this.settings.currency}${tax.toFixed(2)}`;
                document.getElementById('total').textContent = `${this.settings.currency}${total.toFixed(2)}`;

                summary.style.display = 'block';
                checkoutBtn.disabled = false;
            }

            calculateSubtotal() {
                return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }

            clearCart() {
                if (this.cart.length === 0) return;
                this.showConfirm('Clear all items from cart?', () => {
                    this.cart = [];
                    this.renderCart();
                });
            }

            openCheckout() {
                const total = this.calculateSubtotal() + (this.calculateSubtotal() * (this.settings.taxRate / 100));
                document.getElementById('amountPaid').value = total.toFixed(2);
                document.getElementById('customerName').value = '';
                document.getElementById('changeDisplay').style.display = 'none';
                document.getElementById('checkoutModal').classList.add('active');
                this.calculateChange(total);
            }

            closeCheckout() {
                document.getElementById('checkoutModal').classList.remove('active');
            }

            calculateChange(amountPaid) {
                const total = this.calculateSubtotal() + (this.calculateSubtotal() * (this.settings.taxRate / 100));
                const change = amountPaid - total;
                
                if (change >= 0) {
                    document.getElementById('changeDisplay').style.display = 'block';
                    document.getElementById('changeAmount').textContent = `${this.settings.currency}${change.toFixed(2)}`;
                } else {
                    document.getElementById('changeDisplay').style.display = 'none';
                }
            }

            completeSale() {
                const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
                const total = this.calculateSubtotal() + (this.calculateSubtotal() * (this.settings.taxRate / 100));

                if (amountPaid < total) {
                    this.showAlert('Insufficient payment amount!', 'error');
                    return;
                }

                // Update stock
                this.cart.forEach(item => {
                    const product = this.products.find(p => p.id === item.id);
                    if (product) {
                        product.stock -= item.quantity;
                    }
                });

                // Record sale
                const sale = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    items: [...this.cart],
                    subtotal: this.calculateSubtotal(),
                    tax: this.calculateSubtotal() * (this.settings.taxRate / 100),
                    total: total,
                    paymentMethod: this.selectedPaymentMethod,
                    amountPaid: amountPaid,
                    change: amountPaid - total,
                    customerName: document.getElementById('customerName').value || 'Guest'
                };

                this.sales.push(sale);
                this.isDataExported = false; // Require new export for new data
                this.saveData();

                this.closeCheckout();
                this.showReceipt(sale);
                this.cart = [];
                this.renderCart();
                this.renderProducts();
            }

            showReceipt(sale) {
                const receipt = `
                    <div class="receipt-header">
                        <h2>${this.settings.storeName}</h2>
                        <div style="font-size: 14px; color: var(--text-light); margin-top: 8px;">
                            ${new Date(sale.date).toLocaleString()}
                        </div>
                        <div style="font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
                            Transaction #${sale.id}
                        </div>
                    </div>
                    
                    ${sale.items.map(item => `
                        <div class="receipt-item">
                            <span>${item.name} x${item.quantity}</span>
                            <span>${this.settings.currency}${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    
                    <div class="receipt-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border);">
                        <span>Subtotal</span>
                        <span>${this.settings.currency}${sale.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="receipt-item">
                        <span>Tax (${this.settings.taxRate}%)</span>
                        <span>${this.settings.currency}${sale.tax.toFixed(2)}</span>
                    </div>
                    <div class="receipt-item receipt-total">
                        <span>Total</span>
                        <span>${this.settings.currency}${sale.total.toFixed(2)}</span>
                    </div>
                    
                    <div class="receipt-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border);">
                        <span>Payment Method</span>
                        <span>${sale.paymentMethod.toUpperCase()}</span>
                    </div>
                    <div class="receipt-item">
                        <span>Amount Paid</span>
                        <span>${this.settings.currency}${sale.amountPaid.toFixed(2)}</span>
                    </div>
                    <div class="receipt-item">
                        <span>Change</span>
                        <span>${this.settings.currency}${sale.change.toFixed(2)}</span>
                    </div>
                    
                    <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 2px dashed var(--border); font-size: 14px; color: var(--text-light);">
                        Thank you for your business!<br>
                        Customer: ${sale.customerName}
                    </div>
                `;

                document.getElementById('receiptContent').innerHTML = receipt;
                document.getElementById('receiptModal').classList.add('active');
            }

            closeReceipt() {
                document.getElementById('receiptModal').classList.remove('active');
            }

            printReceipt() {
                const content = document.getElementById('receiptContent').innerHTML;
                const printWindow = window.open('', '', 'height=600,width=400');
                printWindow.document.write('<html><head><title>Receipt</title>');
                printWindow.document.write('<style>body{font-family:Arial;padding:20px;}</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            }

            openProductModal(productId = null) {
                const modal = document.getElementById('productModal');
                const title = document.getElementById('productModalTitle');
                
                if (productId) {
                    const product = this.products.find(p => p.id === productId);
                    title.textContent = 'Edit Product';
                    document.getElementById('productId').value = product.id;
                    document.getElementById('productName').value = product.name;
                    document.getElementById('productCategory').value = product.category;
                    document.getElementById('productPrice').value = product.price;
                    document.getElementById('productStock').value = product.stock;
                } else {
                    title.textContent = 'Add Product';
                    document.getElementById('productForm').reset();
                    document.getElementById('productId').value = '';
                }
                
                modal.classList.add('active');
            }

            closeProductModal() {
                document.getElementById('productModal').classList.remove('active');
            }

            saveProduct() {
                const id = document.getElementById('productId').value;
                const name = document.getElementById('productName').value;
                const category = document.getElementById('productCategory').value;
                const price = parseFloat(document.getElementById('productPrice').value);
                const stock = parseInt(document.getElementById('productStock').value);

                if (id) {
                    const product = this.products.find(p => p.id === parseInt(id));
                    product.name = name;
                    product.category = category;
                    product.price = price;
                    product.stock = stock;
                } else {
                    const newId = this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
                    this.products.push({ id: newId, name, category, price, stock });
                }

                this.saveData();
                this.closeProductModal();
                this.renderProducts();
                this.renderInventory();
                this.renderCategories();
            }

            deleteProduct(productId) {
                this.showConfirm('Are you sure you want to delete this product?', () => {
                    this.products = this.products.filter(p => p.id !== productId);
                    this.saveData();
                    this.renderProducts();
                    this.renderInventory();
                    this.renderCategories();
                    this.showAlert('Product deleted.', 'success');
                });
            }

            renderInventory() {
                const table = document.getElementById('inventoryTable');
                table.innerHTML = this.products.map(product => {
                    let stockStatus = 'In Stock';
                    let stockBadge = 'badge-success';
                    
                    if (product.stock === 0) {
                        stockStatus = 'Out of Stock';
                        stockBadge = 'badge-danger';
                    } else if (product.stock < 20) {
                        stockStatus = 'Low Stock';
                        stockBadge = 'badge-warning';
                    }

                    return `
                        <tr>
                            <td>#${product.id}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-weight: 600;">${product.name}</span>
                                </div>
                            </td>
                            <td>${product.category}</td>
                            <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">${this.settings.currency}${product.price.toFixed(2)}</td>
                            <td style="font-weight: 600;">${product.stock}</td>
                            <td><span class="badge ${stockBadge}">${stockStatus}</span></td>
                            <td>
                                <div class="action-btns">
                                    <button class="icon-btn" onclick="pos.openProductModal(${product.id})" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="icon-btn" onclick="pos.deleteProduct(${product.id})" title="Delete"><i class="fas fa-trash-can"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            renderSalesHistory() {
                const totalSales = this.sales.reduce((sum, sale) => sum + sale.total, 0);
                const avgSale = this.sales.length > 0 ? totalSales / this.sales.length : 0;

                document.getElementById('totalSales').textContent = `${this.settings.currency}${totalSales.toFixed(2)}`;
                document.getElementById('totalTransactions').textContent = this.sales.length;
                document.getElementById('avgSale').textContent = `${this.settings.currency}${avgSale.toFixed(2)}`;

                const table = document.getElementById('salesTable');
                table.innerHTML = [...this.sales].reverse().map(sale => `
                    <tr>
                        <td style="font-family: 'JetBrains Mono', monospace;">#${sale.id}</td>
                        <td>${new Date(sale.date).toLocaleString()}</td>
                        <td>${sale.items.length} items</td>
                        <td><span class="badge badge-success">${sale.paymentMethod.toUpperCase()}</span></td>
                        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">${this.settings.currency}${sale.total.toFixed(2)}</td>
                        <td>
                            <button class="icon-btn" onclick="pos.showReceipt(${JSON.stringify(sale).replace(/"/g, '&quot;')})" title="View Receipt"><i class="fas fa-receipt"></i></button>
                        </td>
                    </tr>
                `).join('');
            }

            loadSettings() {
                document.getElementById('storeName').value = this.settings.storeName;
                document.getElementById('taxRate').value = this.settings.taxRate;
                document.getElementById('currency').value = this.settings.currency;
            }

            saveSettings() {
                this.settings.storeName = document.getElementById('storeName').value;
                this.settings.taxRate = parseFloat(document.getElementById('taxRate').value);
                this.settings.currency = document.getElementById('currency').value;
                
                this.saveData();
                this.renderCart();
                this.renderProducts();
                this.showAlert('Settings saved successfully!', 'success');
            }

            exportData() {
                this.requirePassword(() => {
                    const data = {
                        products: this.products,
                        sales: this.sales,
                        settings: this.settings,
                        exportDate: new Date().toISOString()
                    };

                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pos-backup-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.isDataExported = true;
                });
            }

            importData(event) {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        if (this.sales.length > 0 || this.products.length > 0) {
                            this.showConfirm('This will replace all current data. Continue?', () => {
                                this.products = data.products || [];
                                this.sales = data.sales || [];
                                this.settings = data.settings || this.settings;
                                this.saveData();
                                this.renderProducts();
                                this.renderCategories();
                                this.showAlert('Data imported successfully!', 'success');
                            });
                        } else {
                            this.products = data.products || [];
                            this.sales = data.sales || [];
                            this.settings = data.settings || this.settings;
                            this.saveData();
                            this.renderProducts();
                            this.renderCategories();
                            this.showAlert('Data imported successfully!', 'success');
                        }
                    } catch (error) {
                        this.showAlert('Invalid file format!', 'error');
                    }
                };
                reader.readAsText(file);
            }

            resetData() {
                this.requirePassword(() => {
                    this.showConfirm('This will delete ALL data including products, sales, and settings. This cannot be undone! Are you absolutely sure?', () => {
                        localStorage.clear();
                        location.reload();
                    }, 'Reset All Data');
                });
            }

            exportDailyItemsTxt() {
                this.requirePassword(() => {
                    const now = new Date();
                    const todayDate = now.toLocaleDateString();
                    const todayTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    const todaySales = this.sales.filter(sale => new Date(sale.date).toLocaleDateString() === todayDate);

                    if (todaySales.length === 0) {
                        this.showAlert('No sales recorded for today.', 'info');
                        return;
                    }

                    // Aggregate items
                    const itemStats = {};
                    todaySales.forEach(sale => {
                        sale.items.forEach(item => {
                            if (!itemStats[item.name]) {
                                // Find product to get current stock and unit price
                                const product = this.products.find(p => p.name === item.name);
                                itemStats[item.name] = {
                                    price: item.price,
                                    outStock: 0,
                                    inStock: product ? product.stock : 0,
                                    totalPrice: 0
                                };
                            }
                            itemStats[item.name].outStock += item.quantity;
                            itemStats[item.name].totalPrice += (item.price * item.quantity);
                        });
                    });

                    // Sort items by outStock descending
                    const sortedItems = Object.entries(itemStats)
                        .sort(([, a], [, b]) => b.outStock - a.outStock);

                    const totalOutItems = Object.values(itemStats).reduce((sum, item) => sum + item.outStock, 0);
                    const totalUniqueItems = Object.keys(itemStats).length;
                    const totalDayPrice = todaySales.reduce((sum, s) => sum + s.total, 0);

                    // Format text
                    let content = `Daily Sales Report - ${this.settings.storeName}\n\n`;
                    content += `Today: ${todayDate}\n`;
                    content += `Time: ${todayTime}\n\n`;
                    content += `==============================================\n`;
                    content += `N.B: items arranged by sold from max to minimum\n`;
                    content += `==============================================\n\n`;
                    
                    // Table Header
                    content += `${'item'.padEnd(20)} ${'price'.padStart(10)} ${'out stock'.padStart(12)} ${'in stock'.padStart(12)} ${'total price'.padStart(15)}\n`;
                    content += `${'-'.repeat(74)}\n`;

                    // Table Rows
                    sortedItems.forEach(([name, stats]) => {
                        content += `${name.substring(0, 20).padEnd(20)} `;
                        content += `${this.settings.currency}${stats.price.toFixed(2).padStart(9)} `;
                        content += `${stats.outStock.toString().padStart(12)} `;
                        content += `${stats.inStock.toString().padStart(12)} `;
                        content += `${this.settings.currency}${stats.totalPrice.toFixed(2).padStart(14)}\n`;
                    });

                    content += `\n\n==============================================\n`;
                    content += `total out stock: ${totalOutItems.toString().padEnd(10)} from total items: ${totalUniqueItems}\n`;
                    content += `==============================================\n`;
                    content += `total day price: ${this.settings.currency}${totalDayPrice.toFixed(2)}\n`;
                    content += `==============================================\n`;
                    content += `Powered By Chedix Software Solutions`;

                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${this.settings.storeName.replace(/\s+/g, '-')}-report-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.isDataExported = true;
                });
            }

            endSession() {
                if (!this.isDataExported && this.sales.length > 0) {
                    this.showAlert('Please download the daily sales data (TXT) before ending the session.', 'warning');
                    return;
                }

                this.requirePassword(() => {
                    this.showConfirm('Are you sure you want to end the session? This will clear the current sales history but keep your products available.', () => {
                        this.sales = [];
                        this.isDataExported = false; // Reset for next session
                        this.saveData();
                        if (document.getElementById('salesView').classList.contains('active')) {
                            this.renderSalesHistory();
                        }
                        this.renderProducts();
                        this.showAlert('Session ended. Sales history cleared.', 'success');
                    });
                });
            }

            // Password Protection Helpers
            requirePassword(callback) {
                this.pendingAction = callback;
                document.getElementById('systemPasswordInput').value = '';
                document.getElementById('passwordModal').classList.add('active');
                document.getElementById('systemPasswordInput').focus();
            }

            closePasswordModal() {
                document.getElementById('passwordModal').classList.remove('active');
                this.pendingAction = null;
            }

            verifyPassword() {
                const entered = document.getElementById('systemPasswordInput').value;
                if (entered === this.systemPassword) {
                    const action = this.pendingAction;
                    this.closePasswordModal();
                    if (action) action();
                } else {
                    this.showAlert('Incorrect password!', 'error');
                    document.getElementById('systemPasswordInput').value = '';
                    document.getElementById('systemPasswordInput').focus();
                }
            }

            // Custom Alert UI Logic
            showAlert(message, type = 'info', title = '') {
                const modal = document.getElementById('alertModal');
                const icon = document.getElementById('alertIcon');
                const titleEl = document.getElementById('alertTitle');
                const msgEl = document.getElementById('alertMessage');
                const alertActions = document.getElementById('alertActions');
                const confirmActions = document.getElementById('confirmActions');

                titleEl.textContent = title || (type.charAt(0).toUpperCase() + type.slice(1));
                msgEl.textContent = message;
                
                let iconClass = 'fa-circle-info';
                let iconColor = 'var(--primary)';
                
                if (type === 'success') {
                    iconClass = 'fa-circle-check';
                    iconColor = 'var(--secondary)';
                } else if (type === 'error') {
                    iconClass = 'fa-circle-exclamation';
                    iconColor = 'var(--danger)';
                } else if (type === 'warning') {
                    iconClass = 'fa-triangle-exclamation';
                    iconColor = 'var(--warning)';
                }

                icon.innerHTML = `<i class="fas ${iconClass}" style="color: ${iconColor}"></i>`;
                
                alertActions.style.display = 'flex';
                confirmActions.style.display = 'none';
                
                modal.classList.add('active');
            }

            showConfirm(message, callback, title = 'Confirm') {
                const modal = document.getElementById('alertModal');
                const icon = document.getElementById('alertIcon');
                const titleEl = document.getElementById('alertTitle');
                const msgEl = document.getElementById('alertMessage');
                const alertActions = document.getElementById('alertActions');
                const confirmActions = document.getElementById('confirmActions');

                titleEl.textContent = title;
                msgEl.textContent = message;
                icon.innerHTML = `<i class="fas fa-circle-question" style="color: var(--primary)"></i>`;
                
                alertActions.style.display = 'none';
                confirmActions.style.display = 'flex';
                
                this.pendingConfirmAction = callback;
                modal.classList.add('active');
            }

            closeAlert() {
                document.getElementById('alertModal').classList.remove('active');
                this.pendingConfirmAction = null;
            }

            handleConfirm() {
                const action = this.pendingConfirmAction;
                this.closeAlert();
                if (action) action();
            }

            updateTime() {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
                document.getElementById('currentTime').textContent = timeString;
            }
        }

        // Initialize POS System
        const pos = new POSSystem();