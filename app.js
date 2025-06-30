// static/app.js

// =================================================================
//           نظام إدارة المحل - حزمة التطوير الشاملة V6.3
//           (نسخة كاملة ومصححة ومحسنة للطباعة والنسخ الاحتياطي)
// =================================================================

// -------------------- الحالة العامة والإعدادات --------------------
const API_URL = 'http://127.0.0.1:5000/api'; // يظل كما هو ليتصل بسيرفر فلاسك المحلي
let allProducts = [], allOrders = [], allCategories = [], governoratesData = {}, allSuppliers = [];
const orderStatuses = ["جديد", "مؤكد", "للتوصيل", "تم التسليم", "ملغي"];
const paymentMethods = ["كاش", "محفظة إلكترونية", "إنستا باي"];
const CURRENT_USER_ID = 1;

// -------------------- نقطة بداية التطبيق --------------------
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    console.log("--- بدء تهيئة التطبيق ---");
    try {
        await checkServerStatus();
        buildInitialUI();
        setupEventListeners();
        await loadInitialData();
        showPage('orders');
        console.log("--- اكتملت تهيئة التطبيق بنجاح ---");
    } catch (error) {
        console.error("!!! خطأ فادح أثناء تهيئة التطبيق !!!", error);
        const mainContainer = document.querySelector('.container') || document.body;
        mainContainer.innerHTML = `<div class="fixed inset-0 flex items-center justify-center bg-red-100 text-red-800 p-8"><div class="text-center"><h1>حدث خطأ فادح</h1><p class="mt-2">لا يمكن تشغيل التطبيق. يرجى مراجعة الـ Console.</p><p class="text-xs mt-4">${error.message}</p></div></div>`;
    }
}

// -------------------- بناء الواجهة الديناميكي --------------------

function buildInitialUI() {
    const mainNav = document.getElementById('main-nav');
    const mainContent = document.getElementById('main-content');
    const modalsContainer = document.getElementById('modals-container');

    if (!mainNav || !mainContent || !modalsContainer) {
        throw new Error("Core UI containers not found in index.html");
    }

    mainNav.innerHTML = `
        <button onclick="showPage('orders')" id="tab-orders" class="tab-btn flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 p-3 sm:p-4 text-sm sm:text-base"><i class="fas fa-file-invoice-dollar"></i> الطلبات</button>
        <button onclick="showPage('products')" id="tab-products" class="tab-btn flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 p-3 sm:p-4 text-sm sm:text-base"><i class="fas fa-boxes-stacked"></i> المنتجات</button>
        <button onclick="showPage('inventory')" id="tab-inventory" class="tab-grow sm:flex-grow-0 flex items-center justify-center gap-2 p-3 sm:p-4 text-sm sm:text-base"><i class="fas fa-warehouse"></i> المخزون</button>
        <button onclick="showPage('reports')" id="tab-reports" class="tab-btn flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 p-3 sm:p-4 text-sm sm:text-base"><i class="fas fa-chart-line"></i> التقارير</button>
        <button onclick="showPage('settings')" id="tab-settings" class="tab-btn flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 p-3 sm:p-4 text-sm sm:text-base"><i class="fas fa-cog"></i> الإعدادات</button>
    `;

    mainContent.innerHTML = `
        <div id="page-orders" class="page-content"></div>
        <div id="page-products" class="page-content"></div>
        <div id="page-inventory" class="page-content"></div>
        <div id="page-reports" class="page-content"></div>
        <div id="page-settings" class="page-content"></div>
    `;

    modalsContainer.innerHTML = `
        <div id="add-order-modal" class="fixed inset-0 hidden items-center justify-center modal-backdrop"></div>
        <div id="edit-order-modal" class="fixed inset-0 hidden items-center justify-center modal-backdrop"></div>
    `;

    buildOrdersPage();
    buildProductsPage();
    buildInventoryPage();
    buildReportsPage();
    buildSettingsPage();
    buildModals();
}

function buildOrdersPage() {
    document.getElementById('page-orders').innerHTML = `
        <div class="card p-4 sm:p-6">
            <div class="flex flex-col sm:flex-row justify-between items-center mb-4 border-b pb-4 gap-4">
                <h2 class="text-xl sm:text-2xl font-semibold text-gray-700"><i class="fas fa-history text-purple-500 mr-3"></i>الطلبات الحالية</h2>
                <button id="openAddOrderModalBtn" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <i class="fas fa-plus-circle"></i>
                    <span>إضافة طلب جديد</span>
                </button>
            </div>
            <input type="text" id="orderSearchInput" placeholder="ابحث بالاسم، الهاتف، أو رقم الفاتورة..." class="w-full p-3 border rounded-lg mb-4">
            <div id="saved-orders-list" class="space-y-3"></div>
        </div>
    `;
}

function buildProductsPage() {
    document.getElementById('page-products').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div class="lg:col-span-1">
                <div class="card p-4 sm:p-6 sticky top-8">
                    <h2 class="text-xl font-semibold mb-4 border-b pb-3 flex items-center"><i class="fas fa-plus-circle text-green-500 mr-2"></i><span id="product-form-title">إضافة منتج جديد</span></h2>
                    <form id="productForm">
                        <input type="hidden" id="productId">
                        <div class="space-y-4">
                            <input type="text" id="productName" placeholder="اسم المنتج" class="w-full p-3 border rounded-lg" required>
                            <select id="productCategory" class="w-full p-3 border rounded-lg" required></select>
                            <textarea id="productDescription" placeholder="وصف المنتج..." class="w-full p-3 border rounded-lg" rows="2"></textarea>
                            <div id="weights-editor" class="p-3 border rounded-lg space-y-3 bg-gray-50"><h3 class="text-sm font-semibold text-gray-600">الأوزان والأسعار:</h3></div>
                            <button type="button" onclick="addWeightField()" class="text-sm text-blue-600 hover:underline">+ إضافة وزن وسعر</button>
                            <div class="flex justify-end space-x-2 space-x-reverse pt-4 border-t mt-4">
                               <button type="button" onclick="resetProductForm()" class="btn bg-gray-500 text-white py-2 px-6 rounded-lg">إلغاء</button>
                               <button type="submit" class="btn bg-green-500 text-white py-2 px-6 rounded-lg">حفظ المنتج</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="lg:col-span-2">
                 <div class="card p-4 sm:p-6">
                    <h2 class="text-xl sm:text-2xl font-semibold mb-4 border-b pb-4"><i class="fas fa-boxes-stacked text-yellow-500 mr-3"></i>قائمة المنتجات</h2>
                    <div class="overflow-x-auto max-h-[80vh]"><table class="w-full text-right"><thead class="bg-gray-100 sticky top-0"><tr><th class="p-3">المنتج</th><th class="p-3">الفئة</th><th class="p-3">الأسعار والمخزون</th><th class="p-3">إجراءات</th></tr></thead><tbody id="productsTableBody"></tbody></table></div>
                </div>
            </div>
        </div>
    `;
}

function buildInventoryPage() {
    document.getElementById('page-inventory').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 space-y-6">
                <div class="card p-4 sm:p-6">
                    <h2 class="text-xl font-semibold mb-4 border-b pb-3"><i class="fas fa-user-plus text-blue-500 mr-2"></i>إضافة مورد جديد</h2>
                    <form id="supplierForm" class="space-y-4">
                        <input type="text" id="supplierName" placeholder="اسم المورد" class="w-full p-3 border rounded-lg" required>
                        <input type="text" id="supplierContact" placeholder="اسم مسئول التواصل" class="w-full p-3 border rounded-lg">
                        <input type="tel" id="supplierPhone" placeholder="رقم هاتف المورد" class="w-full p-3 border rounded-lg">
                        <button type="submit" class="w-full btn bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600">إضافة المورد</button>
                    </form>
                </div>
                <div class="card p-4 sm:p-6">
                    <h2 class="text-xl font-semibold mb-4 border-b pb-3"><i class="fas fa-users text-gray-500 mr-2"></i>قائمة الموردين</h2>
                    <div id="suppliers-list" class="space-y-2 max-h-60 overflow-y-auto"></div>
                </div>
            </div>
            <div class="lg:col-span-2">
                <div class="card p-4 sm:p-6">
                    <h2 class="text-xl sm:text-2xl font-semibold mb-4 border-b pb-4"><i class="fas fa-cart-plus text-green-500 mr-3"></i>تسجيل فاتورة شراء جديدة</h2>
                    <form id="purchaseForm" class="space-y-4">
                        <div>
                            <label for="purchaseSupplier">اختر المورد</label>
                            <select id="purchaseSupplier" class="w-full p-3 border rounded-lg" required>
                                <option value="">-- اختر مورد --</option>
                            </select>
                        </div>
                        <div id="purchase-item-list" class="space-y-3 bg-gray-50 p-4 rounded-lg border">
                            <h3 class="text-md font-semibold text-gray-700">الأصناف المشتراة</h3>
                        </div>
                        <button type="button" onclick="addPurchaseItemRow()" class="w-full btn bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"><i class="fas fa-plus"></i> إضافة صنف للفاتورة</button>
                        <div>
                            <label for="purchaseNotes">ملاحظات على الفاتورة</label>
                            <textarea id="purchaseNotes" placeholder="أي تفاصيل إضافية..." class="w-full p-3 border rounded-lg" rows="2"></textarea>
                        </div>
                        <div class="mt-4 pt-4 border-t text-lg">
                            <div class="flex justify-between font-bold text-2xl text-green-600">
                                <span>الإجمالي:</span>
                                <span id="purchase-total-price">0.00</span>
                            </div>
                        </div>
                        <button type="submit" class="w-full btn bg-green-600 text-white py-3 text-lg rounded-lg hover:bg-green-700">حفظ الفاتورة وتحديث المخزون</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function buildReportsPage() {
    document.getElementById('page-reports').innerHTML = `
        <div class="space-y-8">
            <div class="card p-4 sm:p-6">
                <h2 class="text-xl sm:text-2xl font-semibold mb-4 border-b pb-3">ملخص الأداء</h2>
                <div class="flex flex-col sm:flex-row flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg mb-6">
                    <div><label for="reportStartDate">من تاريخ</label><input type="date" id="reportStartDate" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></div>
                    <div><label for="reportEndDate">إلى تاريخ</label><input type="date" id="reportEndDate" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></div>
                    <button id="generateReportBtn" class="flex-grow sm:flex-grow-0 btn bg-blue-600 text-white py-2 px-5 rounded-md hover:bg-blue-700"><i class="fas fa-sync-alt mr-2"></i>تحديث</button>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-4" id="kpi-container">
                        <div class="bg-blue-100 text-blue-800 p-4 rounded-lg shadow">
                            <p class="text-sm font-semibold">إجمالي المبيعات</p>
                            <p id="kpi-total-sales" class="text-2xl md:text-3xl font-bold">0.00 ج.م</p>
                        </div>
                        <div class="bg-green-100 text-green-800 p-4 rounded-lg shadow">
                            <p class="text-sm font-semibold">عدد الطلبات الناجحة</p>
                            <p id="kpi-total-orders" class="text-2xl md:text-3xl font-bold">0</p>
                        </div>
                        <div class="bg-purple-100 text-purple-800 p-4 rounded-lg shadow">
                            <p class="text-sm font-semibold">متوسط قيمة الطلب</p>
                            <p id="kpi-avg-order-value" class="text-2xl md:text-3xl font-bold">0.00 ج.م</p>
                        </div>
                    </div>
                    <div class="lg:col-span-2">
                        <h3 class="font-semibold mb-2 text-center text-gray-700">توزيع حالات الطلبات</h3>
                        <div class="w-full h-64 sm:h-80 flex items-center justify-center"><canvas id="status-chart"></canvas></div>
                    </div>
                </div>
            </div>
            <div class="card p-4 sm:p-6">
                <h2 class="text-xl sm:text-2xl font-semibold mb-4 border-b pb-3">سجل الطلبات المفصل</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg mb-6">
                     <div><label for="detailedReportStatus">حالة الطلب</label><select id="detailedReportStatus" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></select></div>
                     <div><label for="detailedReportSearch">بحث بالاسم أو الهاتف</label><input type="text" id="detailedReportSearch" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></div>
                     <div class="md:col-span-2 lg:col-span-2"><button id="detailedReportBtn" class="btn bg-green-600 text-white py-2 px-5 rounded-md hover:bg-green-700 w-full"><i class="fas fa-search mr-2"></i>بحث في السجل</button></div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-right">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2 sm:p-3 w-8"></th>
                                <th class="p-2 sm:p-3">الفاتورة</th>
                                <th class="p-2 sm:p-3">التاريخ</th>
                                <th class="p-2 sm:p-3">العميل</th>
                                <th class="p-2 sm:p-3">الحالة</th>
                                <th class="p-2 sm:p-3">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody id="detailed-report-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function buildSettingsPage() {
    document.getElementById('page-settings').innerHTML = `
         <div class="card p-4 sm:p-6 mb-8">
            <h2 class="text-xl sm:text-2xl font-semibold mb-6 border-b pb-4">إدارة المناطق والمحافظات</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 class="font-semibold text-lg mb-3">إضافة منطقة جديدة</h3>
                    <form id="location-form" class="space-y-4">
                        <input type="text" id="new-governorate" list="governorate-list" placeholder="اسم المحافظة" class="w-full p-3 border rounded-lg" required>
                        <datalist id="governorate-list"></datalist>
                        <input type="text" id="new-region" placeholder="اسم المنطقة" class="w-full p-3 border rounded-lg" required>
                        <button type="submit" class="btn bg-blue-500 text-white w-full py-3 rounded-lg hover:bg-blue-600">إضافة</button>
                    </form>
                </div>
                <div>
                    <h3 class="font-semibold text-lg mb-3">المناطق الحالية</h3>
                    <div id="locations-list" class="space-y-2 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg border"></div>
                </div>
            </div>
        </div>
        <div class="card p-4 sm:p-6">
            <h2 class="text-xl sm:text-2xl font-semibold mb-6 border-b pb-4">أدوات إضافية</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-semibold text-lg mb-2">تصدير البيانات</h3>
                    <p class="text-gray-600 text-sm mb-4">يمكنك تصدير بيانات العملاء المسجلين في البرنامج إلى ملف Excel.</p>
                    <button id="exportCustomersBtn" class="w-full md:w-auto bg-green-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                        <i class="fas fa-file-excel"></i>
                        <span>تصدير العملاء إلى Excel</span>
                    </button>
                </div>
                <div class="mt-6 md:mt-0">
                    <h3 class="font-semibold text-lg mb-2">النسخ الاحتياطي لقاعدة البيانات</h3>
                    <p class="text-gray-600 text-sm mb-4">قم بإنشاء نسخة احتياطية من قاعدة البيانات لحفظ بياناتك.</p>
                    <button id="backupDatabaseBtn" class="w-full md:w-auto bg-orange-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-orange-700 flex items-center justify-center gap-2">
                        <i class="fas fa-database"></i>
                        <span>إنشاء نسخة احتياطية</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function buildModals() {
    const addOrderModal = document.getElementById('add-order-modal');
    addOrderModal.innerHTML = `
        <div class="modal-content bg-white rounded-lg shadow-xl w-11/12 max-w-3xl flex flex-col">
            <div class="p-4 border-b flex justify-between items-center"><h3 class="text-xl font-semibold text-gray-800"><i class="fas fa-plus-circle text-blue-500 mr-2"></i> إضافة طلب جديد</h3><button onclick="closeModal('add-order-modal')" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button></div>
            <div class="overflow-y-auto p-6">
                <form id="orderForm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input type="text" id="customerName" placeholder="اسم العميل" class="p-3 border rounded-lg" required>
                        <input type="tel" id="customerPhone" placeholder="رقم الهاتف" class="p-3 border rounded-lg">
                        <select id="governorate" class="p-3 border rounded-lg"><option value="">-- اختر المحافظة --</option></select>
                        <select id="region" class="p-3 border rounded-lg"><option value="">-- اختر المنطقة --</option></select>
                        <div class="md:col-span-2"><input type="text" id="customerAddress" placeholder="العنوان التفصيلي (الشارع، رقم العمارة...)" class="w-full p-3 border rounded-lg"></div>
                    </div>
                    <div id="order-product-list" class="space-y-3 mb-4 bg-gray-50 p-4 rounded-lg border"></div>
                    <button type="button" onclick="addOrderProductRow()" class="btn bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 w-full mb-4"><i class="fas fa-plus"></i> إضافة منتج للطلب</button>
                    <div class="space-y-4">
                        <textarea id="orderNotes" placeholder="ملاحظات..." class="w-full p-3 border rounded-lg" rows="2"></textarea>
                        <div class="grid grid-cols-3 gap-4">
                            <div><label for="shippingCost">الشحن</label><input type="number" id="shippingCost" value="0" min="0" class="w-full p-2 border rounded-lg" oninput="updateOrderTotal()"></div>
                            <div><label for="discount">الخصم</label><input type="number" id="discount" value="0" min="0" class="w-full p-2 border rounded-lg" oninput="updateOrderTotal()"></div>
                            <div><label for="amountPaid">المدفوع</label><input type="number" id="amountPaid" value="0" min="0" class="w-full p-2 border rounded-lg" oninput="updateOrderTotal()"></div>
                        </div>
                        <div class="mt-1">
                            <label for="paymentMethod">طريقة الدفع</label>
                            <select id="paymentMethod" class="w-full p-2 border rounded-lg"></select>
                        </div>
                        <div id="payment-details-container" class="mt-1" style="display: none;">
                            <label for="paymentDetails">تفاصيل الدفع (رقم هاتف / عنوان)</label>
                            <input type="text" id="paymentDetails" class="w-full p-2 border rounded-lg" placeholder="e.g., 01xxxxxxxxx or username@instapay">
                        </div>
                        <div class="mt-4 pt-4 border-t text-lg"><div class="flex justify-between font-bold text-2xl text-blue-600"><span>الإجمالي:</span><span id="total-price">0.00</span></div></div>
                    </div>
                </form>
            </div>
            <div class="text-left p-4 border-t bg-gray-50 flex justify-end space-x-2 space-x-reverse"><button type="button" onclick="closeModal('add-order-modal')" class="btn bg-gray-500 text-white py-2 px-6 rounded-lg">إغلاق</button><button type="submit" form="orderForm" class="btn bg-blue-500 text-white py-2 px-6 rounded-lg">حفظ الطلب</button></div>
        </div>
    `;

    const editOrderModal = document.getElementById('edit-order-modal');
    editOrderModal.innerHTML = `
        <div class="modal-content bg-white rounded-lg shadow-xl w-11/12 max-w-4xl flex flex-col">
            <div class="p-4 border-b flex justify-between items-center no-print">
                <h3 id="edit-order-title" class="text-xl font-semibold text-gray-800"></h3>
                <button onclick="closeModal('edit-order-modal')" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            
            <div id="edit-order-content" class="overflow-y-auto">
                </div>
            
            <div class="text-left p-4 border-t flex justify-between items-center no-print">
                <button onclick="printOrder(currentOrderDetails)" class="btn bg-gray-600 text-white py-2 px-4 rounded-lg"><i class="fas fa-print"></i> طباعة</button>
                <div>
                    <button type="button" onclick="closeModal('edit-order-modal')" class="btn bg-gray-400 text-white py-2 px-4 rounded-lg">إلغاء</button>
                    <button type="button" onclick="handleUpdateOrder()" class="btn bg-blue-600 text-white py-2 px-4 rounded-lg"><i class="fas fa-save"></i> حفظ التعديلات</button>
                </div>
            </div>
        </div>
    `;
}

// -------------------- Event Listeners & Data Loading --------------------

function setupEventListeners() {
    const body = document.body;
    
    // ======== تعديل: استخدام event delegation بشكل أساسي ========
    body.addEventListener('submit', event => {
        event.preventDefault();
        const formId = event.target.id;
        if (formId === 'orderForm') handleOrderSubmit(event);
        if (formId === 'productForm') handleProductSubmit(event);
        if (formId === 'location-form') handleAddLocation(event);
        if (formId === 'supplierForm') handleAddSupplier(event);
        if (formId === 'purchaseForm') handlePurchaseSubmit(event);
    });

    body.addEventListener('input', event => {
        if (event.target.id === 'orderSearchInput') debounce(() => loadOrders(true), 300)();
        
        const form = event.target.closest('form');
        if (form) {
            if (form.id === 'orderForm') updateOrderTotal();
            if (form.id === 'editOrderForm') updateEditOrderTotal();
            if (form.id === 'purchaseForm') updatePurchaseTotal();
        }
    });
    
    body.addEventListener('change', event => {
        const target = event.target;
        if (target.id === 'paymentMethod') handlePaymentMethodChange(event);
        if (target.id === 'governorate') populateRegions(target.value, 'region');
        if (target.classList.contains('item-category')) populateProductsForCategory(target);
        if (target.classList.contains('item-product')) populateWeightsForProduct(target);
        if (target.classList.contains('item-weight')) handleWeightSelection(target);
    });

    // ======== إصلاح: إضافة event listeners للأزرار التي لم تكن تعمل ========
    document.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.id === 'openAddOrderModalBtn') openAddOrderModal();
        if (target.id === 'generateReportBtn') loadDashboardReport();
        if (target.id === 'detailedReportBtn') loadDetailedReport();
        // ======== إضافة: زر تصدير العملاء ========
        if (target.id === 'exportCustomersBtn') exportCustomersToExcel();
        // ======== إضافة: زر النسخ الاحتياطي لقاعدة البيانات ========
        if (target.id === 'backupDatabaseBtn') backupDatabase();
    });
}

async function loadInitialData() {
    try {
        await Promise.all([ loadLocations(), loadCategories(), loadProducts(), loadSuppliers() ]);
        await loadOrders(false);
        setDefaultDates();
        await loadDashboardReport();
        
        const statusFilter = document.querySelector('#detailedReportStatus');
        if (statusFilter) {
            statusFilter.innerHTML = '<option value="">-- كل الحالات --</option>';
            orderStatuses.forEach(s => statusFilter.innerHTML += `<option value="${s}">${s}</option>`);
        }
    } catch (error) {
        console.error("Failed during initial data load:", error);
    }
}

async function loadResource(url, resourceName) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) return result.data;
        else throw new Error(result.error || `Failed to load ${resourceName}`);
    } catch (e) {
        console.error(`Failed to load ${resourceName}:`, e);
        showToast(`فشل تحميل ${resourceName}`, 'error');
        throw e;
    }
}

async function checkServerStatus() {
    const statusIndicator = document.getElementById('status-indicator');
    try {
        await fetch(`${API_URL}/health`);
        statusIndicator.textContent = 'متصل';
        statusIndicator.style.color = '#10b981';
    } catch (e) {
        statusIndicator.textContent = 'غير متصل بالخادم';
        statusIndicator.style.color = '#ef4444';
        throw new Error("Server connection failed");
    }
}

async function loadLocations() { governoratesData = await loadResource(`${API_URL}/locations`, 'Locations'); renderLocationsList(); }
async function loadCategories() { allCategories = await loadResource(`${API_URL}/categories`, 'Categories'); populateCategories(document.querySelector('#productCategory')); }
async function loadProducts() { allProducts = await loadResource(`${API_URL}/products`, 'Products'); renderProducts(); }
async function loadSuppliers() { allSuppliers = await loadResource(`${API_URL}/suppliers`, 'Suppliers'); renderSuppliersList(); populateSupplierDropdown(); }
async function loadOrders(isSearch = false) {
    const list = document.querySelector('#saved-orders-list');
    if(list) list.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i></div>`;
    const searchTerm = document.querySelector('#orderSearchInput')?.value || '';
    const url = searchTerm && isSearch ? `${API_URL}/orders?search=${searchTerm}` : `${API_URL}/orders`;
    allOrders = await loadResource(url, 'Orders');
    renderOrders();
}

// -------------------- Render Functions --------------------
function renderProducts() {
    const tableBody = document.querySelector('#productsTableBody');
    if(!tableBody) return;
    tableBody.innerHTML = '';
    if (allProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">لا توجد منتجات.</td></tr>`;
        return;
    }
    allProducts.forEach(p => {
        const weightsHtml = p.weights.map(w =>
            `<div class="text-xs my-1 p-1 rounded ${w.Stock > 10 ? 'bg-green-100 text-green-800' : (w.Stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}"> 
                ${w.WeightName}: <strong>${w.Price}</strong> ج.م (مخزون: ${w.Stock})
            </div>`
        ).join('');

        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-semibold">${p.ProductName}</td>
                <td class="p-3 text-gray-600">${p.CategoryName}</td>
                <td class="p-3">${weightsHtml}</td>
                <td class="p-3">
                    <button onclick="editProduct(${p.ProductID})" class="text-blue-600 hover:text-blue-800" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${p.ProductID})" class="text-red-600 hover:text-red-800 mr-2" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}
function renderOrders() {
    const list = document.querySelector('#saved-orders-list');
    if(!list) return;
    list.innerHTML = '';
    if (allOrders.length === 0) {
        list.innerHTML = `<div class="text-center p-8 text-gray-500">لا توجد طلبات لعرضها.</div>`;
        return;
    }
    allOrders.forEach(order => {
        list.innerHTML += `
            <div class="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <div class="flex flex-col sm:flex-row justify-between items-center">
                    <div class="mb-2 sm:mb-0 text-center sm:text-right">
                        <span class="font-bold text-lg text-gray-800">${order.CustomerName || 'عميل غير مسجل'}</span>
                        <span class="text-sm text-gray-500 block">${order.PhoneNumber || ''}</span>
                        <span class="text-xs text-gray-400">#${order.InvoiceNumber}</span>
                    </div>
                    <div class="text-center sm:text-left">
                        <span class="font-bold text-xl text-blue-600">${order.FinalAmount.toFixed(2)} ج.م</span>
                        <span class="block text-sm font-semibold text-white px-2 py-1 rounded-full ${getStatusColor(order.OrderStatus)} mt-1">${order.OrderStatus}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-3 text-xs text-gray-500">
                    <span><i class="fas fa-calendar-alt mr-1"></i>${new Date(order.OrderDate).toLocaleString('ar-EG')}</span>
                    <button onclick="openEditOrderModal(${order.OrderID})" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-lg">عرض التفاصيل</button>
                </div>
            </div>
        `;
    });
}
function renderLocationsList() {
    const listContainer = document.querySelector('#locations-list');
    const datalist = document.querySelector('#governorate-list');
    if (!listContainer || !datalist) return;
    listContainer.innerHTML = '';
    datalist.innerHTML = '';
    Object.keys(governoratesData).sort().forEach(gov => {
        datalist.innerHTML += `<option value="${gov}">`;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-3';
        const regionsHtml = governoratesData[gov].sort().map(region => `<li>${region}</li>`).join('');
        groupDiv.innerHTML = `<h4 class="font-bold text-gray-700">${gov}</h4><ul class="list-disc list-inside pr-4 text-sm">${regionsHtml}</ul>`;
        listContainer.appendChild(groupDiv);
    });
}
function renderSuppliersList() {
    const container = document.querySelector('#suppliers-list');
    if(!container) return;
    container.innerHTML = '';
    if (allSuppliers.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-sm">لا يوجد موردين.</p>`;
        return;
    }
    allSuppliers.forEach(s => {
        container.innerHTML += `
            <div class="p-2 border-b text-sm">
                <p class="font-bold">${s.SupplierName}</p>
                <p class="text-xs text-gray-600">${s.PhoneNumber || 'لا يوجد رقم هاتف'}</p>
            </div>
        `;
    });
}
function renderDetailedReportTable(orders) {
    const tableBody = document.querySelector('#detailed-report-table-body');
    tableBody.innerHTML = '';
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد طلبات تطابق معايير البحث.</td></tr>';
        return;
    }
    orders.forEach(order => {
        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 cursor-pointer" onclick="toggleOrderDetails(${order.OrderID}, this)">
                <td class="p-3 text-center text-gray-400"><i class="fas fa-chevron-down"></i></td>
                <td class="p-3 text-sm">${order.InvoiceNumber}</td>
                <td class="p-3 text-sm">${new Date(order.OrderDate).toLocaleDateString('ar-EG')}</td>
                <td class="p-3 font-semibold">${order.CustomerName || ''}</td>
                <td class="p-3"><span class="text-xs font-semibold text-white px-2 py-1 rounded-full ${getStatusColor(order.OrderStatus)}">${order.OrderStatus}</span></td>
                <td class="p-3 font-bold text-blue-600">${order.FinalAmount.toFixed(2)} ج.م</td>
            </tr>`;
    });
}

// -------------------- Modal Management & Content --------------------
function openModal(modalId) { const modal = document.getElementById(modalId); if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); } }
function closeModal(modalId) { const modal = document.getElementById(modalId); if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }

function openAddOrderModal() {
    resetOrderForm();
    populateGovernorates(document.querySelector('#governorate'));
    populateStaticDropdowns(document.querySelector('#paymentMethod'));
    openModal('add-order-modal');
}
// ======== تحسين: إعادة هيكلة دالة فتح شاشة تعديل الطلب لتشمل المعاينة ========
let currentOrderDetails = null; // متغير لحفظ تفاصيل الطلب الحالي للطباعة

async function openEditOrderModal(orderId) {
    const modalContent = document.getElementById('edit-order-content');
    if (!modalContent) return;
    modalContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i></div>`;
    openModal('edit-order-modal');

    try {
        const order = await loadResource(`${API_URL}/orders/${orderId}`, 'Single Order');
        if (!order) {
            closeModal('edit-order-modal');
            return;
        }
        currentOrderDetails = order; // حفظ تفاصيل الطلب الحالي

        document.querySelector('#edit-order-title').textContent = `تفاصيل الطلب #${order.InvoiceNumber}`;

        // هنا بنولد HTML الفاتورة لنسخة العميل ونسخة المحل
        const invoiceCustomerHtml = createInvoiceHTML(order).replace('{{COPY_TITLE}}', 'نسخة العميل');
        const invoiceStoreHtml = createInvoiceHTML(order).replace('{{COPY_TITLE}}', 'نسخة المحل');

        modalContent.innerHTML = `
            <div class="p-4 sm:p-6 no-print">
                <div class="border-b border-gray-200 mb-4">
                    <nav class="-mb-px flex space-x-4 space-x-reverse" aria-label="Tabs">
                        <button onclick="showModalTab('edit-form-container', this)" class="modal-tab-btn active-tab whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">
                            تعديل الطلب
                        </button>
                        <button onclick="showModalTab('invoice-preview-container', this)" class="modal-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">
                            معاينة الفاتورة
                        </button>
                    </nav>
                </div>
                
                <div id="edit-form-container" class="modal-tab-content">
                    <form id="editOrderForm">
                        <input type="hidden" id="edit-orderId" value="${order.OrderID}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input type="text" class="p-3 border rounded-lg bg-gray-200" value="${order.CustomerName || ''}" disabled>
                            <input type="tel" class="p-3 border rounded-lg bg-gray-200" value="${order.PhoneNumber || ''}" disabled>
                        </div>
                        <div id="edit-order-product-list" class="space-y-2 mb-4"></div>
                        <button type="button" onclick="addOrderProductRow('edit-order-product-list')" class="btn bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 w-full mb-4"><i class="fas fa-plus"></i> إضافة منتج</button>
                        <div class="space-y-4">
                            <div><label for="edit-orderNotes">الملاحظات</label><textarea id="edit-orderNotes" class="w-full p-3 border rounded-lg" rows="2">${order.Notes || ''}</textarea></div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><label for="edit-shippingCost">الشحن</label><input type="number" id="edit-shippingCost" value="${order.ShippingCost}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
                                <div><label for="edit-discount">الخصم</label><input type="number" id="edit-discount" value="${order.DiscountAmount}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><label for="edit-paymentMethod">طريقة الدفع</label><select id="edit-paymentMethod" class="w-full p-2 border rounded-lg"></select></div>
                                <div><label for="edit-amountPaid">المبلغ المدفوع</label><input type="number" id="edit-amountPaid" value="${order.AmountPaid}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><label for="edit-orderStatus">حالة الطلب</label><select id="edit-orderStatus" class="w-full p-2 border rounded-lg bg-gray-100"></select></div>
                                <div><label>حالة الدفع</label><div id="edit-paymentStatus" class="w-full p-2 rounded-lg text-white text-center font-semibold"></div></div>
                            </div>
                            <div class="mt-4 pt-4 border-t text-lg"><div class="flex justify-between font-bold text-2xl text-blue-600"><span>الإجمالي:</span><span id="edit-total-price">${order.FinalAmount.toFixed(2)}</span></div></div>
                        </div>
                    </form>
                </div>

                <div id="invoice-preview-container" class="modal-tab-content hidden">
                    <div class="invoice-copy">${invoiceCustomerHtml}</div>
                </div>
            </div>

            <!-- يتم عرض منطقة الطباعة فقط عند الطباعة -->
            <div class="print-area hidden">
                <div class="invoice-copy">${invoiceCustomerHtml}</div>
                <div class="invoice-copy">${invoiceStoreHtml}</div>
            </div>
        `;

        // Populate the dynamic parts of the newly created form
        populateStaticDropdowns(document.querySelector('#edit-paymentMethod'), order.PaymentMethod);
        const statusSelect = document.querySelector('#edit-orderStatus');
        statusSelect.innerHTML = '';
        orderStatuses.forEach(s => statusSelect.innerHTML += `<option value="${s}" ${order.OrderStatus === s ? 'selected' : ''}>${s}</option>`);
        order.items.forEach(item => addOrderProductRow('edit-order-product-list', item));
        updateEditOrderTotal();

    } catch (error) {
        console.error("Failed to open edit modal:", error);
        closeModal('edit-order-modal');
    }
}


// -------------------- Handlers --------------------
// All handlers (handleOrderSubmit, handleUpdateOrder, etc.) are defined here

async function handleOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const finalTotal = parseFloat(form.querySelector('#total-price').textContent);
    const amountPaid = parseFloat(form.querySelector('#amountPaid').value) || 0;
    const paymentDetails = form.querySelector('#paymentDetails').value;
    let notes = form.querySelector('#orderNotes').value;
    if (paymentDetails) {
        notes = `${notes}\n--- تفاصيل الدفع ---\n${paymentDetails}`.trim();
    }

    const orderData = {
        customerName: form.querySelector('#customerName').value,
        customerPhone: form.querySelector('#customerPhone').value,
        governorate: form.querySelector('#governorate').value,
        region: form.querySelector('#region').value,
        address: form.querySelector('#customerAddress').value, // تم إضافة هذا الحقل
        notes: notes,
        shippingCost: parseFloat(form.querySelector('#shippingCost').value) || 0,
        discount: parseFloat(form.querySelector('#discount').value) || 0,
        finalTotal: finalTotal,
        paymentMethod: form.querySelector('#paymentMethod').value,
        amountPaid: amountPaid,
        userId: CURRENT_USER_ID,
        paymentStatus: determinePaymentStatus(finalTotal, amountPaid),
        items: []
    };
    let subTotal = 0;
    form.querySelectorAll('.order-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        if (!priceId) return;
        const unitPrice = parseFloat(row.querySelector('.item-price').value);
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        subTotal += unitPrice * quantity;
        orderData.items.push({ priceId, quantity, unitPrice, totalPrice: unitPrice * quantity });
    });
    orderData.total = subTotal;
    if (orderData.items.length === 0) {
        // بدلاً من alert()، استخدام ShowMessage() لرسائل الأخطاء
        showMessage('يجب إضافة منتج واحد على الأقل للطلب.', 'error');
        return; 
    }
    
    try {
        const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        const result = await response.json();
        if (result.success) {
            showMessage(`تم حفظ الطلب ${result.invoice} بنجاح.`, 'success');
            closeModal('add-order-modal');
            await Promise.all([loadOrders(), loadProducts(), loadDashboardReport()]);
        } else {
            showMessage(`خطأ في حفظ الطلب: ${result.error}`, 'error');
        }
    } catch (e) {
        showMessage('حدث خطأ في الاتصال بالخادم. يرجى التأكد أن الخادم يعمل.', 'error');
    }
}
async function handleUpdateOrder() {
    const form = document.querySelector('#editOrderForm');
    if(!form) return;
    const orderId = form.querySelector('#edit-orderId').value;
    const finalTotal = parseFloat(form.querySelector('#edit-total-price').textContent);
    const amountPaid = parseFloat(form.querySelector('#edit-amountPaid').value) || 0;
    const orderData = {
        status: form.querySelector('#edit-orderStatus').value,
        paymentMethod: form.querySelector('#edit-paymentMethod').value,
        amountPaid: amountPaid,
        shippingCost: parseFloat(form.querySelector('#edit-shippingCost').value) || 0,
        discount: parseFloat(form.querySelector('#edit-discount').value) || 0,
        finalTotal: finalTotal,
        paymentStatus: determinePaymentStatus(finalTotal, amountPaid),
        notes: form.querySelector('#edit-orderNotes').value,
        items: []
    };
    let subTotal = 0;
    form.querySelectorAll('.order-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        if (!priceId) return;
        const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        subTotal += unitPrice * quantity;
        orderData.items.push({ priceId, quantity, unitPrice, totalPrice: unitPrice * quantity });
    });
    orderData.total = subTotal;
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        const result = await response.json();
        if (result.success) {
            showMessage('تم تحديث الطلب بنجاح.', 'success');
            closeModal('edit-order-modal');
            await Promise.all([loadOrders(), loadProducts(), loadDashboardReport()]);
        } else {
            showMessage(`فشل التحديث: ${result.error}`, 'error');
        }
    } catch (e) {
        showMessage('حدث خطأ في الاتصال بالخادم.', 'error');
    }
}
function handlePaymentMethodChange(event) {
    const selectedMethod = event.target.value;
    const detailsContainer = document.querySelector('#payment-details-container');
    const detailsInput = document.querySelector('#paymentDetails');
    if(!detailsContainer || !detailsInput) return;

    if (selectedMethod === 'كاش') {
        detailsContainer.style.display = 'none';
        detailsInput.value = '';
    } else {
        detailsContainer.style.display = 'block';
    }
}
async function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const productId = form.querySelector('#productId').value;
    const weights = Array.from(form.querySelectorAll('#weights-editor > div')).map(div => ({
        name: div.querySelector('.weight-name').value,
        price: parseFloat(div.querySelector('.weight-price').value),
        stock: parseInt(div.querySelector('.weight-stock').value, 10),
        priceId: div.querySelector('.weight-price-id').value || null
    }));
    const data = { 
        name: form.querySelector('#productName').value, 
        category_id: form.querySelector('#productCategory').value, 
        description: form.querySelector('#productDescription').value, 
        weights: weights 
    };
    const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
    const method = productId ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (result.success) {
            showMessage(result.message, 'success');
            resetProductForm();
            await loadProducts();
        } else {
            showMessage(`خطأ: ${result.error}`, 'error');
        }
    } catch (err) {
        showMessage('فشل الاتصال بالخادم.', 'error');
    }
}
async function handleAddSupplier(event) {
    event.preventDefault();
    const form = event.target;
    const supplierData = {
        name: form.querySelector('#supplierName').value,
        contact: form.querySelector('#supplierContact').value,
        phone: form.querySelector('#supplierPhone').value
    };
    if (!supplierData.name) {
        showMessage('اسم المورد مطلوب.', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
        });
        const result = await response.json();
        if (result.success) {
            showMessage('تمت إضافة المورد بنجاح.', 'success');
            form.reset();
            await loadSuppliers();
        } else {
            showMessage(`خطأ: ${result.error}`, 'error');
        }
    } catch (err) {
        showMessage('فشل الاتصال بالخادم.', 'error');
    }
}
async function handlePurchaseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const purchaseData = {
        supplierId: form.querySelector('#purchaseSupplier').value,
        notes: form.querySelector('#purchaseNotes').value,
        items: []
    };

    let totalAmount = 0;
    form.querySelectorAll('.purchase-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        const costPrice = parseFloat(row.querySelector('.item-cost').value);

        if (priceId && quantity > 0 && costPrice >= 0) {
            const totalPrice = quantity * costPrice;
            totalAmount += totalPrice;
            purchaseData.items.push({ priceId, quantity, costPrice, totalPrice });
        }
    });

    if (!purchaseData.supplierId) {
        showMessage('يجب اختيار مورد.', 'error');
        return;
    }
    if (purchaseData.items.length === 0) {
        showMessage('يجب إضافة صنف واحد على الأقل لفاتورة الشراء.', 'error');
        return;
    }
    purchaseData.totalAmount = totalAmount;

    try {
        const response = await fetch(`${API_URL}/purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(purchaseData)
        });
        const result = await response.json();
        if (result.success) {
            showMessage(result.message, 'success');
            if (result.updated_products) {
                allProducts = result.updated_products;
                renderProducts();
            }
            form.reset();
            const purchaseList = form.querySelector('#purchase-item-list');
            if (purchaseList) {
                purchaseList.innerHTML = '<h3 class="text-md font-semibold text-gray-700">الأصناف المشتراة</h3>';
            }
            addPurchaseItemRow();
            form.querySelector('#purchase-total-price').textContent = '0.00';
        } else {
            showMessage(`خطأ في حفظ الفاتورة: ${result.error}`, 'error');
        }
    } catch (e) {
        showMessage('حدث خطأ في الاتصال بالخادم.', 'error');
    }
}
async function handleAddLocation(event) {
    event.preventDefault();
    const form = event.target;
    const gov = form.querySelector('#new-governorate').value;
    const region = form.querySelector('#new-region').value;
    try {
        const response = await fetch(`${API_URL}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ governorate: gov, region: region }) });
        const result = await response.json();
        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            await loadLocations();
        } else {
            showMessage(`خطأ: ${result.error}`, 'error');
        }
    } catch (err) {
        showMessage('فشل الاتصال بالخادم.', 'error');
    }
}
// ======== إضافة: دالة تصدير العملاء إلى Excel ========
async function exportCustomersToExcel() {
    try {
        // تم تعديل المسار هنا للتأكد
        const response = await fetch(`${API_URL}/customers/export`);
        console.log("Response status:", response.status); // للتأكد
        if (!response.ok) {
            throw new Error('فشل في تصدير البيانات من الخادم');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'بيانات_العملاء.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showMessage('تم تصدير ملف Excel بنجاح!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showMessage('حدث خطأ أثناء تصدير البيانات. تأكد من أن الخادم يعمل بشكل صحيح.', 'error');
    }
}

// ======== إضافة: دالة النسخ الاحتياطي لقاعدة البيانات ========
async function backupDatabase() {
    try {
        showMessage('جاري إنشاء نسخة احتياطية من قاعدة البيانات...', 'info');
        const response = await fetch(`${API_URL}/backup`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`فشل النسخ الاحتياطي: ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // تسمية ملف النسخ الاحتياطي بتاريخ اليوم والوقت
        const date = new Date();
        const backupFileName = `store_backup_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.db`;
        a.download = backupFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showMessage('تم إنشاء النسخة الاحتياطية بنجاح!', 'success');
    } catch (error) {
        console.error('Backup failed:', error);
        showMessage(`حدث خطأ أثناء إنشاء النسخة الاحتياطية: ${error.message || error}.`, 'error');
    }
}


// -------------------- UI Helpers & Logic --------------------
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    const page = document.getElementById(`page-${pageId}`);
    const tab = document.getElementById(`tab-${pageId}`);
    if (page) page.classList.add('active');
    if (tab) tab.classList.add('active-tab');
}
const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => { func.apply(this, args); }, delay); }; };

// ======== تعديل: دالة طباعة مخصصة للفاتورة فقط ========
function printOrder(order) {
    if (!order) {
        showMessage('لا توجد بيانات طلب للطباعة.', 'error');
        return;
    }

    const printArea = document.querySelector('.print-area');
    const noPrintElements = document.querySelectorAll('.no-print');

    // إخفاء العناصر التي لا يجب طباعتها
    noPrintElements.forEach(el => el.style.display = 'none');
    printArea.classList.remove('hidden'); // إظهار منطقة الطباعة

    window.print(); // تشغيل أمر الطباعة في المتصفح/Electron

    // بعد الطباعة، إرجاع العناصر لحالتها الطبيعية
    printArea.classList.add('hidden'); // إخفاء منطقة الطباعة
    noPrintElements.forEach(el => el.style.display = ''); // إظهار العناصر المخفية
}

function showModalTab(tabId, buttonElement) {
    const modal = buttonElement.closest('.modal-content');
    modal.querySelectorAll('.modal-tab-content').forEach(el => el.classList.add('hidden'));
    modal.querySelectorAll('.modal-tab-btn').forEach(el => el.classList.remove('active-tab'));
    document.getElementById(tabId).classList.remove('hidden');
    buttonElement.classList.add('active-tab');
}

function resetOrderForm() {
    const form = document.querySelector('#orderForm');
    if(form) form.reset();
    document.querySelector('#order-product-list').innerHTML = '';
    document.querySelector('#total-price').textContent = '0.00';
    document.querySelector('#payment-details-container').style.display = 'none';
    document.querySelector('#paymentDetails').value = '';
    addOrderProductRow();
}
function resetProductForm() {
    const form = document.querySelector('#productForm');
    if (form) form.reset();
    document.querySelector('#productId').value = '';
    const weightsEditor = document.querySelector('#weights-editor');
    if(weightsEditor) weightsEditor.innerHTML = '<h3 class="text-sm font-semibold text-gray-600">الأوزان والأسعار:</h3>';
    document.querySelector('#product-form-title').textContent = 'إضافة منتج جديد';
    addWeightField();
}
function editProduct(productId) {
    const product = allProducts.find(p => p.ProductID == productId);
    if (!product) return;
    showPage('products');
    window.scrollTo(0, 0);
    document.querySelector('#product-form-title').textContent = `تعديل: ${product.ProductName}`;
    document.querySelector('#productId').value = product.ProductID;
    document.querySelector('#productName').value = product.ProductName;
    document.querySelector('#productCategory').value = product.CategoryID;
    document.querySelector('#productDescription').value = product.Description;
    const weightsContainer = document.querySelector('#weights-editor');
    weightsContainer.innerHTML = '<h3 class="text-sm font-semibold text-gray-600">الأوزان والأسعار:</h3>';
    product.weights.forEach(w => addWeightField({ name: w.WeightName, price: w.Price, stock: w.Stock, priceId: w.PriceID }));
}
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم إخفاؤه من القوائم.')) return;
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            showMessage('تم حذف المنتج بنجاح.', 'success');
            await loadProducts();
        } else {
            showMessage(`فشل الحذف: ${result.error}`, 'error');
        }
    } catch (e) {
        showMessage('فشل الاتصال بالخادم.', 'error');
    }
}
function addOrderProductRow(containerId = 'order-product-list', item = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rowId = `item-${Date.now()}${Math.random()}`;
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'p-3 border rounded-lg bg-white space-y-2 order-item-row';
    row.innerHTML = `<div class="grid grid-cols-12 gap-2 items-center"><div class="col-span-11 grid grid-cols-1 sm:grid-cols-3 gap-2"><select class="p-2 border rounded item-category"><option value="">-- التصنيف --</option>${allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('')}</select><select class="p-2 border rounded item-product" disabled><option value="">-- المنتج --</option></select><select class="p-2 border rounded item-weight" disabled><option value="">-- الوزن --</option></select></div><button type="button" onclick="removeRowAndUpdateTotal('${rowId}', 'order')" class="col-span-1 text-red-500 hover:text-red-700 text-lg justify-self-center"><i class="fas fa-trash-alt"></i></button></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center"><div><label class="text-sm">الكمية</label><input type="number" value="${item.Quantity || 1}" min="1" class="w-full p-2 border rounded item-qty" oninput="updateOrderTotalWrapper(this)"></div><div><label class="text-sm">السعر</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-price" readonly></div><div class="col-span-2 sm:col-span-2"><label class="text-sm">المخزون</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-stock" readonly></div></div><input type="hidden" class="item-price-id">`;
    container.appendChild(row);

    if (item.ProductID) {
        const product = allProducts.find(p => p.ProductID === item.ProductID);
        if (product) {
            row.querySelector('.item-category').value = product.CategoryID;
            populateProductsForCategory(row.querySelector('.item-category'));
            row.querySelector('.item-product').value = item.ProductID;
            populateWeightsForProduct(row.querySelector('.item-product'));
            row.querySelector('.item-weight').value = item.PriceID;
            handleWeightSelection(row.querySelector('.item-weight'));
        }
    }
}
function addPurchaseItemRow() {
    const container = document.getElementById('purchase-item-list');
    if (!container) return;
    const rowId = `purchase-item-${Date.now()}${Math.random()}`;
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'p-3 border rounded-lg bg-white space-y-2 purchase-item-row';
    row.innerHTML = `<div class="grid grid-cols-12 gap-2 items-center"><div class="col-span-11 grid grid-cols-1 sm:grid-cols-3 gap-2"><select class="p-2 border rounded item-category"><option value="">-- التصنيف --</option>${allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('')}</select><select class="p-2 border rounded item-product" disabled><option value="">-- المنتج --</option></select><select class="p-2 border rounded item-weight" disabled><option value="">-- الوزن --</option></select></div><button type="button" onclick="removeRowAndUpdateTotal('${rowId}', 'purchase')" class="col-span-1 text-red-500 hover:text-red-700 text-lg justify-self-center"><i class="fas fa-trash-alt"></i></button></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center"><div><label class="text-sm">الكمية</label><input type="number" value="1" min="1" class="w-full p-2 border rounded item-qty" oninput="updatePurchaseTotal()"></div><div class="col-span-2"><label class="text-sm">سعر التكلفة</label><input type="number" step="0.01" value="0" min="0" class="w-full p-2 border rounded item-cost" oninput="updatePurchaseTotal()"></div><div><label class="text-sm">الإجمالي</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-total-cost" readonly></div></div><input type="hidden" class="item-price-id">`;
    container.appendChild(row);
}
function addWeightField(weight = {}) {
    const container = document.querySelector('#weights-editor');
    const id = `weight-${Date.now()}${Math.random()}`;
    container.insertAdjacentHTML('beforeend', `<div id="${id}" class="grid grid-cols-10 gap-2 items-center"><input type="hidden" class="weight-price-id" value="${weight.priceId || ''}"><input type="text" placeholder="الوزن" class="col-span-4 p-2 border rounded weight-name" value="${weight.name || ''}" required><input type="number" step="0.01" placeholder="السعر" class="col-span-2 p-2 border rounded weight-price" value="${weight.price || ''}" required><input type="number" placeholder="المخزون" class="col-span-3 p-2 border rounded weight-stock" value="${weight.stock || '0'}"><button type="button" onclick="document.getElementById('${id}').remove()" class="col-span-1 text-red-500 hover:text-red-700" title="إزالة"><i class="fas fa-times-circle"></i></button></div>`);
}
function removeRowAndUpdateTotal(rowId, type) {
    const row = document.getElementById(rowId);
    if (row) {
        const form = row.closest('form');
        row.remove();
        if (type === 'order') {
            if (form && form.id === 'editOrderForm') {
                updateEditOrderTotal();
            } else {
                updateOrderTotal();
            }
        } else if (type === 'purchase') {
            updatePurchaseTotal();
        }
    }
}
function updateOrderTotalWrapper(element) {
    const form = element.closest('form');
    if (form && form.id === 'editOrderForm') {
        updateEditOrderTotal();
    } else {
        updateOrderTotal();
    }
}

// Population and Update functions
function populateProductsForCategory(categorySelect) {
    const row = categorySelect.closest('.order-item-row, .purchase-item-row');
    if(!row) return;
    const selectedCategoryId = categorySelect.value;
    const productSelect = row.querySelector('.item-product');
    const weightSelect = row.querySelector('.item-weight');
    productSelect.innerHTML = '<option value="">-- المنتج --</option>';
    weightSelect.innerHTML = '<option value="">-- الوزن --</option>';
    productSelect.disabled = true; weightSelect.disabled = true;
    if (selectedCategoryId) {
        const products = allProducts.filter(p => p.CategoryID == selectedCategoryId);
        products.forEach(p => { productSelect.innerHTML += `<option value="${p.ProductID}">${p.ProductName}</option>`; });
        productSelect.disabled = false;
    }
}
function populateWeightsForProduct(productSelect) {
    const row = productSelect.closest('.order-item-row, .purchase-item-row');
    if(!row) return;
    const selectedProductId = productSelect.value;
    const weightSelect = row.querySelector('.item-weight');
    weightSelect.innerHTML = '<option value="">-- الوزن --</option>';
    weightSelect.disabled = true;
    if (selectedProductId) {
        const product = allProducts.find(p => p.ProductID == selectedProductId);
        if(product) {
            product.weights.forEach(w => {
                const isPurchaseRow = row.classList.contains('purchase-item-row');
                const disabled = !isPurchaseRow && w.Stock <= 0 ? 'disabled' : '';
                const stockInfo = !isPurchaseRow ? (w.Stock > 0 ? `(متاح: ${w.Stock})` : '(نفذ)') : '';
                weightSelect.innerHTML += `<option value="${w.PriceID}" data-price="${w.Price}" data-stock="${w.Stock}" ${disabled}>${w.WeightName} ${stockInfo}</option>`;
            });
            weightSelect.disabled = false;
        }
    }
}
function handleWeightSelection(weightSelect) {
    const row = weightSelect.closest('.order-item-row, .purchase-item-row');
    if(!row) return;
    const selectedOption = weightSelect.options[weightSelect.selectedIndex];
    row.querySelector('.item-price-id').value = weightSelect.value;
    if (row.classList.contains('order-item-row')) {
        row.querySelector('.item-price').value = parseFloat(selectedOption.dataset.price || 0).toFixed(2);
        row.querySelector('.item-stock').value = selectedOption.dataset.stock || 0;
        const form = weightSelect.closest('form');
        if (form && form.id === 'editOrderForm') updateEditOrderTotal();
        else updateOrderTotal();
    } else {
        updatePurchaseTotal();
    }
}

function updateOrderTotal() {
    const form = document.querySelector('#orderForm');
    if(!form) return;
    let subTotal = 0;
    form.querySelectorAll('.order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        subTotal += price * qty;
    });
    const shipping = parseFloat(form.querySelector('#shippingCost').value) || 0;
    const discount = parseFloat(form.querySelector('#discount').value) || 0;
    form.querySelector('#total-price').textContent = (subTotal + shipping - discount).toFixed(2);
}
function updateEditOrderTotal() {
    const form = document.querySelector('#editOrderForm');
    if(!form) return;
    let subTotal = 0;
    form.querySelectorAll('.order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        subTotal += price * qty;
    });
    const shipping = parseFloat(form.querySelector('#edit-shippingCost').value) || 0;
    const discount = parseFloat(form.querySelector('#edit-discount').value) || 0;
    const finalTotal = subTotal + shipping - discount;
    form.querySelector('#edit-total-price').textContent = finalTotal.toFixed(2);
    const amountPaid = parseFloat(form.querySelector('#edit-amountPaid').value) || 0;
    const paymentStatusDiv = form.querySelector('#edit-paymentStatus');
    const paymentStatus = determinePaymentStatus(finalTotal, amountPaid);
    const statusInfo = getPaymentStatusInfo(paymentStatus);
    paymentStatusDiv.textContent = statusInfo.text;
    paymentStatusDiv.className = `w-full p-2 rounded-lg text-white text-center font-semibold ${statusInfo.bgColor}`;
}
function updatePurchaseTotal() {
    const form = document.querySelector('#purchaseForm');
    if(!form) return;
    let totalCost = 0;
    form.querySelectorAll('.purchase-item-row').forEach(row => {
        const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        const itemTotal = cost * qty;
        row.querySelector('.item-total-cost').value = itemTotal.toFixed(2);
        totalCost += itemTotal;
    });
    form.querySelector('#purchase-total-price').textContent = totalCost.toFixed(2);
}

// Helper functions
function populateGovernorates(select) { if (!select) return; select.innerHTML = '<option value="">-- اختر المحافظة --</option>'; Object.keys(governoratesData).sort().forEach(g => select.innerHTML += `<option value="${g}">${g}</option>`); }
function populateRegions(gov, regionSelectId) { const select = document.getElementById(regionSelectId); if (!select) return; const regions = governoratesData[gov] || []; select.innerHTML = '<option value="">-- اختر المنطقة --</option>'; regions.sort().forEach(reg => select.innerHTML += `<option value="${reg}">${reg}</option>`); }
function populateCategories(select) { if (!select) return; select.innerHTML = '<option value="">-- اختر الفئة --</option>'; allCategories.forEach(c => select.innerHTML += `<option value="${c.CategoryID}">${c.CategoryName}</option>`); }
function populateStaticDropdowns(select, selectedValue = null) { if (!select) return; select.innerHTML = ''; paymentMethods.forEach(p => select.innerHTML += `<option value="${p}" ${p === selectedValue ? 'selected' : ''}>${p}</option>`); }
function populateSupplierDropdown() { const select = document.querySelector('#purchaseSupplier'); if (!select) return; select.innerHTML = '<option value="">-- اختر مورد --</option>'; allSuppliers.forEach(s => { select.innerHTML += `<option value="${s.SupplierID}">${s.SupplierName}</option>`; }); }
function determinePaymentStatus(total, paid) { if (paid <= 0) return 'لم يدفع'; if (paid >= total) return 'مدفوع بالكامل'; return 'مدفوع جزئيًا'; }
function getStatusColor(status) { const colors = { 'جديد': 'bg-blue-500', 'مؤكد': 'bg-yellow-500', 'للتوصيل': 'bg-purple-500', 'تم التسليم': 'bg-green-500', 'ملغي': 'bg-red-500' }; return colors[status] || 'bg-gray-500'; }
function getPaymentStatusInfo(status) { const statuses = { 'لم يدفع': { text: 'لم يدفع', bgColor: 'bg-red-500' }, 'مدفوع جزئيًا': { text: 'مدفوع جزئيًا', bgColor: 'bg-yellow-500' }, 'مدفوع بالكامل': { text: 'مدفوع بالكامل', bgColor: 'bg-green-500' }, }; return statuses[status] || { text: status, bgColor: 'bg-gray-500' }; }

// ======== إضافة: دالة لعرض رسائل للمستخدم بدلاً من alert() و confirm() ========
function showMessage(message, type = 'info', duration = 3000) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 transform transition-transform duration-300 ease-out ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`;
    messageContainer.textContent = message;
    document.body.appendChild(messageContainer);

    setTimeout(() => {
        messageContainer.classList.add('translate-x-full');
        messageContainer.addEventListener('transitionend', () => messageContainer.remove());
    }, duration);
}


// Reports Functions
async function loadDashboardReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const url = `${API_URL}/reports/dashboard?start_date=${startDate}&end_date=${endDate}`;
    try {
        const data = await loadResource(url, 'Dashboard Report');
        let totalSales = 0, totalOrders = 0;
        const statusCounts = {};
        const statusColors = [];
        const statusLabels = [];

        orderStatuses.forEach(s => {
            statusCounts[s] = 0;
        });

        if (data.statuses) {
            data.statuses.forEach(status => {
                const isCancelledOrReturned = status.OrderStatus === 'ملغي';
                if (!isCancelledOrReturned) { totalSales += status.total; totalOrders += status.count; }
                if(statusCounts.hasOwnProperty(status.OrderStatus)) {
                    statusCounts[status.OrderStatus] = status.count;
                }
            });
        }
        
        for (const status of orderStatuses) {
            statusLabels.push(status);
            statusColors.push(getStatusColor(status).replace('bg-', ''));
        }
        
        document.getElementById('kpi-total-sales').textContent = `${totalSales.toFixed(2)} ج.م`;
        document.getElementById('kpi-total-orders').textContent = totalOrders;
        const avgOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;
        document.getElementById('kpi-avg-order-value').textContent = `${avgOrderValue.toFixed(2)} ج.م`;
        const ctx = document.getElementById('status-chart');
        if (ctx) {
            if (window.myStatusChart) window.myStatusChart.destroy();
            window.myStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: { 
                    labels: statusLabels, 
                    datasets: [{ 
                        data: Object.values(statusCounts), 
                        backgroundColor: ['#3b82f6', '#eab308', '#8b5cf6', '#22c55e', '#ef4444', '#6b7280'] 
                    }] 
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }
    } catch (e) { console.error("Failed to load dashboard report:", e); }
}
async function loadDetailedReport() {
    const tableBody = document.querySelector('#detailed-report-table-body');
    if(!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i></td></tr>';
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const status = document.getElementById('detailedReportStatus').value;
    const searchTerm = document.getElementById('detailedReportSearch').value;
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, status: status, search_term: searchTerm });
    const url = `${API_URL}/reports/detailed_orders?${params.toString()}`;
    try {
        const orders = await loadResource(url, 'Detailed Report');
        renderDetailedReportTable(orders);
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">فشل تحميل التقرير.</td></tr>';
    }
}
async function toggleOrderDetails(orderId, rowElement) {
    const icon = rowElement.querySelector('i');
    const nextRow = rowElement.nextElementSibling;
    if (nextRow && nextRow.classList.contains('details-row')) {
        nextRow.remove();
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        return;
    }
    icon.classList.replace('fa-chevron-down', 'fa-spinner');
    icon.classList.add('fa-spin');
    try {
        const orderDetails = await loadResource(`${API_URL}/orders/${orderId}`, 'Single Order Details');
        if (!orderDetails) { throw new Error('Order details not found'); }
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row bg-gray-50';
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 6;
        const itemsHtml = orderDetails.items.map(i => `
            <li class="flex justify-between items-center text-sm py-1">
                <span>${i.ProductName} (${i.WeightName}) x ${i.Quantity}</span>
                <span class="font-mono">${i.TotalPrice.toFixed(2)}</span>
            </li>`).join('');
        detailsCell.innerHTML = `<div class="p-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 class="font-bold mb-2 text-gray-700">تفاصيل الأصناف:</h4><ul class="space-y-1">${itemsHtml}</ul></div><div><h4 class="font-bold mb-2 text-gray-700">الملخص المالي:</h4><div class="text-sm space-y-1"><p class="flex justify-between"><span>إجمالي فرعي:</span> <span>${orderDetails.TotalAmount.toFixed(2)}</span></p><p class="flex justify-between"><span>شحن:</span> <span>${orderDetails.ShippingCost.toFixed(2)}</span></p><p class="flex justify-between text-red-500"><span>خصم:</span> <span>-${orderDetails.DiscountAmount.toFixed(2)}</span></p><hr class="my-1"><p class="flex justify-between font-bold"><span>إجمالي الفاتورة:</span> <span>${orderDetails.FinalAmount.toFixed(2)}</span></p><p class="flex justify-between text-green-600"><span>المدفوع:</span> <span>${orderDetails.AmountPaid.toFixed(2)}</span></p></div><button onclick="openEditOrderModal(${orderId})" class="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"><i class="fas fa-file-invoice mr-2"></i>عرض وتعديل الفاتورة الكاملة</button></div></div></div>`;
        detailsRow.appendChild(detailsCell);
        rowElement.after(detailsRow);
        icon.classList.replace('fa-spinner', 'fa-chevron-up');
    } catch (e) {
        console.error('Error fetching details:', e);
        icon.classList.replace('fa-spinner', 'fa-chevron-down');
    } finally {
        icon.classList.remove('fa-spin');
    }
}
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today;
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    document.getElementById('reportStartDate').value = thirtyDaysAgo;
}
function createInvoiceHTML(order) {
    const itemsHtml = order.items.map(i => `
        <tr class="border-b">
            <td class="p-2">${i.ProductName} (${i.WeightName})</td>
            <td class="p-2 text-center">${i.Quantity}</td>
            <td class="p-2 text-center">${i.UnitPrice.toFixed(2)}</td>
            <td class="p-2 text-left">${i.TotalPrice.toFixed(2)}</td>
        </tr>`).join('');
    
    const remainingAmount = order.FinalAmount - order.AmountPaid;
    const paymentStatusInfo = getPaymentStatusInfo(order.PaymentStatus);

    return `
        <div class="p-4 sm:p-6 text-sm bg-white rounded-lg">
            <div class="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-4">
                <div>
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-800">فاتورة مبيعات</h2>
                    <p class="text-gray-500">{{COPY_TITLE}}</p>
                </div>
                <div class="text-left mt-2 sm:mt-0">
                    <p><strong>فاتورة رقم:</strong> ${order.InvoiceNumber}</p>
                    <p><strong>التاريخ:</strong> ${new Date(order.OrderDate).toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                    <h3 class="font-semibold text-gray-600 mb-1">بيانات العميل:</h3>
                    <p>${order.CustomerName || 'غير مسجل'}</p>
                    <p>${order.PhoneNumber || ''}</p>
                    <p>${order.Governorate || ''} - ${order.Region || ''}</p>
                    ${order.Address ? `<p>${order.Address}</p>` : ''}
                </div>
                <div class="text-left flex sm:flex-col sm:items-end sm:justify-center">
                    <div class="px-3 py-2 rounded-lg text-white font-bold ${paymentStatusInfo.bgColor} print-bg-gray-200">
                        حالة السداد: ${paymentStatusInfo.text}
                    </div>
                </div>
            </div>

            <table class="w-full text-right border-collapse mb-4">
                <thead class="bg-gray-200 print-bg-gray-200">
                    <tr>
                        <th class="p-2 text-right">المنتج</th>
                        <th class="p-2 text-center">الكمية</th>
                        <th class="p-2 text-center">سعر الوحدة</th>
                        <th class="p-2 text-left">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <div class="flex flex-col sm:flex-row justify-between mt-6">
                <div class="w-full sm:w-1/2">
                    ${order.Notes ? `<h4 class="font-semibold mb-1">ملاحظات:</h4><p class="text-xs border p-2 rounded-md bg-gray-50 h-16 break-words">${order.Notes}</p>` : ''}
                </div>
                <div class="w-full sm:w-2/5 mt-4 sm:mt-0">
                    <div class="space-y-2">
                        <div class="flex justify-between"><span class="text-gray-600">الإجمالي الفرعي:</span><strong>${order.TotalAmount.toFixed(2)}</strong></div>
                        <div class="flex justify-between"><span class="text-gray-600">الشحن:</span><strong>${order.ShippingCost.toFixed(2)}</strong></div>
                        <div class="flex justify-between text-red-600 print-text-red-600"><span >الخصم:</span><strong>-${order.DiscountAmount.toFixed(2)}</strong></div>
                        <hr class="my-1">
                        <div class="flex justify-between text-xl font-bold"><span >الإجمالي النهائي:</span><span>${order.FinalAmount.toFixed(2)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">المبلغ المدفوع:</span><strong>${order.AmountPaid.toFixed(2)}</strong></div>
                        <div class="flex justify-between font-bold ${remainingAmount > 0 ? 'text-red-600 print-text-red-600' : 'text-green-600 print-text-green-600'}">
                            <span>المبلغ المتبقي:</span><span>${remainingAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-400 mt-8">
                <p>شكرا لتعاملكم معنا - عسل بسملة</p>
            </div>
        </div>
    `;
}
```

**أهم التغييرات اللي حصلت في `app.js`:**

1.  **زرار النسخ الاحتياطي:**
    * تم إضافة زرار جديد في صفحة الإعدادات (`buildSettingsPage`) بالـ `id="backupDatabaseBtn"`.
    * تم إضافة `event listener` لزرار النسخ الاحتياطي `backupDatabaseBtn` في دالة `setupEventListeners`، اللي بتنادي دالة `backupDatabase()`.
    * تم إضافة دالة `backupDatabase()` جديدة. الدالة دي هتبعت طلب لـ `API_URL/backup` وهتتعامل مع ملف الـ `.db` اللي هيرجع من السيرفر.

2.  **تحسين الطباعة:**
    * تم تعديل دالة `printOrder(order)` عشان تستقبل بيانات الطلب (الفاتورة) وتطبع الجزء الخاص بالفاتورة فقط عن طريق إظهار وإخفاء عناصر معينة باستخدام الكلاسات `no-print` و `print-area`، بدل ما تطبع كل الصفحة.
    * تم حفظ تفاصيل الطلب في متغير `currentOrderDetails` داخل `openEditOrderModal` ليتم استخدامها عند الطباعة.

3.  **رسائل التنبيه (Toasts):**
    * تم استبدال كل استخدامات `alert()` و `confirm()` بدالة `showMessage()` جديدة ومحسنة، عشان تظهر رسائل أنيقة على الشاشة بدل الـ Popups المزعجة.

**الخطوات اللي هتعملها بعد كده:**

1.  **احفظ التعديلات:** انسخ الكود اللي فوق ده كله والصقه في ملف `app.js` عندك.
2.  **التعديل في `api.py` (المهمة الجاية):**
    * هنحتاج نضيف endpoint جديد في `api.py` يستقبل طلب النسخ الاحتياطي ويرجع ملف قاعدة البيانات.
3.  **التعديل في `database_api.py` (المهمة الجاية):**
    * هنحتاج نضيف دالة جديدة في `DatabaseAPI` عشان تنسخ قاعدة البيانات لمسار مؤقت ثم ترجعها.
4.  **إعادة بناء الـ EXE والـ Setup:**
    * بعد ما نخلص كل التعديلات في ملفات Python، هتعمل `rebuild` للـ `exe` بـ `PyInstaller` زي ما عملنا قبل كده.
    * وبعدين هتعمل Setup جديد بـ Inno Setup.

قولي لما تخلص نسخ الكود في `app.js` عشان نخش على التعديلات في `api.p