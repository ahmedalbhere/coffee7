const firebaseConfig = {
  databaseURL: "https://coffee-dda5d-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// عناصر واجهة المستخدم
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');
const ordersContainer = document.getElementById('orders');
const menuListContainer = document.getElementById('menu-list');
const reportsSection = document.getElementById('reports-section');
const addItemForm = document.getElementById('add-item-form');

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-year').textContent = new Date().getFullYear();
  adminPanel.style.display = 'none';
  
  // التحقق من تسجيل الدخول السابق
  if (localStorage.getItem('adminLoggedIn') === 'true') {
    loginSection.style.display = 'none';
    adminPanel.style.display = 'block';
    loadData();
  }

  // إعداد مستمع لتغيير نوع التقرير
  document.getElementById('report-type').addEventListener('change', toggleCustomDate);
});

// تسجيل الدخول
function login() {
  const pass = document.getElementById('admin-pass').value;
  
  if (pass === "4321") {
    loginSection.style.display = 'none';
    adminPanel.style.display = 'block';
    localStorage.setItem('adminLoggedIn', 'true');
    loadData();
  } else {
    alert("كلمة المرور غير صحيحة");
    document.getElementById('admin-pass').value = '';
  }
}

// تسجيل الخروج
function logout() {
  if (confirm("هل تريد تسجيل الخروج من لوحة التحكم؟")) {
    localStorage.removeItem('adminLoggedIn');
    loginSection.style.display = 'block';
    adminPanel.style.display = 'none';
  }
}

// تحميل البيانات
function loadData() {
  loadOrders();
  loadMenuList();
}

// تحميل الطلبات مع إمكانية التصفية
function loadOrders(filter = 'all') {
  db.ref("orders").orderByChild("timestamp").on("value", snapshot => {
    ordersContainer.innerHTML = '';
    const orders = snapshot.val();
    
    if (!orders) {
      ordersContainer.innerHTML = `
        <div class="empty-orders">
          <i class="fas fa-clipboard"></i>
          <p>لا توجد طلبات حالياً</p>
        </div>
      `;
      return;
    }
    
    const ordersArray = Object.entries(orders).reverse();
    let hasOrders = false;
    
    ordersArray.forEach(([key, order]) => {
      if (filter === 'all' || 
          (filter === 'pending' && order.status !== 'completed') || 
          (filter === 'completed' && order.status === 'completed')) {
        
        hasOrders = true;
        const orderElement = createOrderElement(key, order);
        ordersContainer.appendChild(orderElement);
      }
    });
    
    if (!hasOrders) {
      ordersContainer.innerHTML = `
        <div class="empty-orders">
          <i class="fas fa-clipboard"></i>
          <p>لا توجد طلبات ${filter === 'pending' ? 'قيد الانتظار' : 'مكتملة'}</p>
        </div>
      `;
    }
  });
}

// إنشاء عنصر طلب
function createOrderElement(key, order) {
  const orderElement = document.createElement('div');
  orderElement.className = `order-card ${order.status === 'completed' ? 'completed' : 'pending'}`;
  
  let itemsHTML = '';
  let total = 0;
  
  order.items.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    
    itemsHTML += `
      <div class="order-item">
        <div class="item-name">${item.name}</div>
        <div class="item-details">
          <span class="item-qty">${item.qty} ×</span>
          <span class="item-price">${item.price} ج</span>
          <span class="item-total">${itemTotal.toFixed(2)} ج</span>
        </div>
        ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
      </div>
    `;
  });
  
  orderElement.innerHTML = `
    <div class="order-header">
      <div class="order-meta">
        <span class="order-id">#${key.substring(0, 6)}</span>
        <span class="order-status ${order.status === 'completed' ? 'completed' : 'pending'}">
          ${order.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
        </span>
      </div>
      <div class="order-title">
        <i class="fas fa-table"></i> الطاولة: ${order.table}
      </div>
      <div class="order-time">${formatTime(order.timestamp)}</div>
    </div>
    
    <div class="order-items">${itemsHTML}</div>
    
    <div class="order-footer">
      <div class="order-total">المجموع: ${total.toFixed(2)} جنيه</div>
      <div class="order-actions">
        ${order.status !== 'completed' ? `
          <button onclick="completeOrder('${key}')" class="btn-complete">
            <i class="fas fa-check"></i> تم الانتهاء
          </button>
        ` : ''}
        <button onclick="deleteOrder('${key}')" class="btn-delete">
          <i class="fas fa-trash"></i> حذف
        </button>
      </div>
    </div>
  `;
  
  return orderElement;
}

// تحميل قائمة الطعام
function loadMenuList() {
  db.ref("menu").on("value", snapshot => {
    menuListContainer.innerHTML = '';
    const items = snapshot.val();
    
    if (!items) {
      menuListContainer.innerHTML = `
        <div class="empty-menu">
          <i class="fas fa-utensils"></i>
          <p>لا توجد أصناف في القائمة</p>
        </div>
      `;
      return;
    }
    
    for (const [key, item] of Object.entries(items)) {
      const itemElement = createMenuItemElement(key, item);
      menuListContainer.appendChild(itemElement);
    }
  });
}

// إنشاء عنصر قائمة طعام
function createMenuItemElement(key, item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'menu-item';
  
  itemElement.innerHTML = `
    <div class="menu-item-info">
      <div class="item-name">${item.name}</div>
      <div class="item-price">${item.price} جنيه</div>
    </div>
    <div class="menu-item-actions">
      <button onclick="editMenuItem('${key}', '${item.name}', '${item.price}')" class="btn-edit">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="deleteMenuItem('${key}')" class="btn-delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  
  return itemElement;
}

// إضافة صنف جديد
function addMenuItem() {
  const name = document.getElementById('newItem').value.trim();
  const price = document.getElementById('newPrice').value;
  
  if (!name || !price) {
    alert("الرجاء إدخال اسم الصنف والسعر");
    return;
  }
  
  if (isNaN(price) || parseFloat(price) <= 0) {
    alert("السعر يجب أن يكون رقماً موجباً");
    return;
  }
  
  db.ref("menu").push({
    name: name,
    price: parseFloat(price).toFixed(2)
  }).then(() => {
    document.getElementById('newItem').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newItem').focus();
  });
}

// تمييز الطلب كمكتمل
function completeOrder(orderId) {
  if (confirm("هل تريد تمييز هذا الطلب كمكتمل؟")) {
    db.ref(`orders/${orderId}`).update({
      status: "completed",
      completedAt: firebase.database.ServerValue.TIMESTAMP
    });
  }
}

// حذف الطلب
function deleteOrder(orderId) {
  if (confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
    db.ref(`orders/${orderId}`).remove();
  }
}

// حذف جميع الطلبات المكتملة
function clearCompleted() {
  if (confirm("هل تريد حذف جميع الطلبات المكتملة؟ هذا الإجراء لا يمكن التراجع عنه.")) {
    db.ref("orders").once("value").then(snapshot => {
      const orders = snapshot.val();
      const updates = {};
      
      for (const [key, order] of Object.entries(orders)) {
        if (order.status === "completed") {
          updates[key] = null;
        }
      }
      
      db.ref("orders").update(updates);
    });
  }
}

// حذف صنف من القائمة
function deleteMenuItem(itemId) {
  if (confirm("هل أنت متأكد من حذف هذا الصنف من القائمة؟")) {
    db.ref(`menu/${itemId}`).remove();
  }
}

// تعديل صنف في القائمة
function editMenuItem(itemId, currentName, currentPrice) {
  const newName = prompt("اسم الصنف الجديد:", currentName);
  if (newName === null) return;
  
  const newPrice = prompt("السعر الجديد:", currentPrice);
  if (newPrice === null) return;
  
  if (newName && newPrice && !isNaN(newPrice) {
    db.ref(`menu/${itemId}`).update({
      name: newName,
      price: parseFloat(newPrice).toFixed(2)
    });
  } else {
    alert("الرجاء إدخال بيانات صحيحة");
  }
}

// تصفية الطلبات
function filterOrders(type) {
  // تحديث واجهة التصفية
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // تحميل الطلبات المصفاة
  loadOrders(type);
}

// عرض شاشة التقارير
function showReports() {
  document.querySelectorAll('.admin-section').forEach(section => {
    section.style.display = 'none';
  });
  reportsSection.style.display = 'block';
}

// تبديل عرض نطاق التاريخ المخصص
function toggleCustomDate() {
  const type = document.getElementById('report-type').value;
  document.getElementById('custom-date-range').style.display = 
    type === 'custom' ? 'block' : 'none';
}

// توليد التقرير
function generateReport() {
  const type = document.getElementById('report-type').value;
  let startDate, endDate;
  
  if (type === 'custom') {
    startDate = new Date(document.getElementById('start-date').value);
    endDate = new Date(document.getElementById('end-date').value);
    
    if (!startDate || !endDate) {
      alert("الرجاء تحديد تاريخ البداية والنهاية");
      return;
    }
  } else {
    const now = new Date();
    startDate = new Date();
    endDate = new Date();
    
    if (type === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === 'weekly') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(startDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }
  }
  
  db.ref("orders").orderByChild("timestamp")
    .startAt(startDate.getTime())
    .endAt(endDate.getTime())
    .once("value").then(snapshot => {
      const orders = snapshot.val();
      const reportData = processReportData(orders, type);
      displayReport(reportData, type);
    });
}

// معالجة بيانات التقرير
function processReportData(orders, type) {
  if (!orders) return null;
  
  const report = {
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    popularItems: {},
    byTime: {}
  };
  
  Object.values(orders).forEach(order => {
    if (order.status === 'completed') {
      report.totalOrders++;
      report.completedOrders++;
      
      let timeKey;
      const date = new Date(order.timestamp);
      
      if (type === 'daily') {
        timeKey = date.getHours() + ':00';
      } else if (type === 'weekly') {
        timeKey = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][date.getDay()];
      } else {
        timeKey = date.getDate() + ' ' + ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][date.getMonth()];
      }
      
      report.byTime[timeKey] = (report.byTime[timeKey] || 0) + 1;
      
      order.items.forEach(item => {
        report.totalRevenue += item.price * item.qty;
        report.popularItems[item.name] = (report.popularItems[item.name] || 0) + item.qty;
      });
    }
  });
  
  // ترتيب الأصناف الأكثر طلباً
  report.popularItems = Object.entries(report.popularItems)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return report;
}

// عرض التقرير
function displayReport(data, type) {
  const reportEl = document.getElementById('report-results');
  
  if (!data || data.totalOrders === 0) {
    reportEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <p>لا توجد بيانات للعرض في الفترة المحددة</p>
      </div>
    `;
    return;
  }
  
  let timeChartHTML = '';
  Object.entries(data.byTime).forEach(([time, count]) => {
    const percentage = (count / data.completedOrders * 100).toFixed(1);
    timeChartHTML += `
      <div class="chart-row">
        <div class="chart-label">${time}</div>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width: ${percentage}%"></div>
          <span class="chart-value">${count} (${percentage}%)</span>
        </div>
      </div>
    `;
  });
  
  let popularItemsHTML = '';
  data.popularItems.forEach(([name, qty]) => {
    popularItemsHTML += `
      <div class="popular-item">
        <span class="item-name">${name}</span>
        <span class="item-qty">${qty} طلب</span>
      </div>
    `;
  });
  
  reportEl.innerHTML = `
    <div class="report-summary">
      <div class="summary-card">
        <h3>إجمالي الطلبات</h3>
        <div class="summary-value">${data.totalOrders}</div>
      </div>
      <div class="summary-card">
        <h3>الطلبات المكتملة</h3>
        <div class="summary-value">${data.completedOrders}</div>
      </div>
      <div class="summary-card">
        <h3>إجمالي المبيعات</h3>
        <div class="summary-value">${data.totalRevenue.toFixed(2)} ج</div>
      </div>
    </div>
    
    <div class="report-charts">
      <div class="chart-container">
        <h3>توزيع الطلبات حسب ${type === 'daily' ? 'ساعات اليوم' : type === 'weekly' ? 'أيام الأسبوع' : 'أيام الشهر'}</h3>
        <div class="time-chart">${timeChartHTML}</div>
      </div>
      
      <div class="chart-container">
        <h3>الأصناف الأكثر طلباً</h3>
        <div class="popular-items">${popularItemsHTML}</div>
      </div>
    </div>
  `;
}

// تصدير التقرير
function exportReport() {
  const reportData = document.getElementById('report-results').innerText;
  const blob = new Blob([reportData], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير-مبيعات-${new Date().toLocaleDateString()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// عرض نموذج إضافة صنف
function showAddForm() {
  addItemForm.style.display = addItemForm.style.display === 'none' ? 'block' : 'none';
}

// تنسيق الوقت
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// تصدير الدوال للوصول إليها من HTML
window.login = login;
window.logout = logout;
window.addMenuItem = addMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.deleteOrder = deleteOrder;
window.completeOrder = completeOrder;
window.filterOrders = filterOrders;
window.clearCompleted = clearCompleted;
window.showReports = showReports;
window.generateReport = generateReport;
window.exportReport = exportReport;
window.showAddForm = showAddForm;
window.editMenuItem = editMenuItem;
window.toggleCustomDate = toggleCustomDate;
