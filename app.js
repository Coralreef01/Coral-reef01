const GOOGLE_SCRIPT_URL = 'ضع_رابط_جوجل_شيت_هنا'; 

let tempSelectedItems = []; 
let localCustomers = JSON.parse(localStorage.getItem('localCustomers')) || [];
let localEquipment = JSON.parse(localStorage.getItem('localEquipment')) || [];
let localRentals = JSON.parse(localStorage.getItem('localRentals')) || [];

// دالة التنقل بين الصفحات
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.style.setProperty('display', 'none', 'important');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.setProperty('display', 'block', 'important');
        window.scrollTo(0, 0);
    }
    if (pageId === 'rentals-page') updateEquipmentDropdown();
    if (pageId === 'stats-page') renderStatsTable();
}

window.addEventListener('DOMContentLoaded', () => {
    showPage('equipment-page');
    updateEquipmentDropdown();
});

// تحديث قائمة المعدات المتاحة في صفحة التأجير
function updateEquipmentDropdown() {
    const select = document.getElementById('available-equipment-select');
    if (!select) return;
    select.innerHTML = '';
    if (localEquipment.length === 0) {
        select.innerHTML = '<option value="">لا توجد معدات مسجلة بالنظام</option>';
        return;
    }
    localEquipment.forEach((eq, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `${eq.type} - ${eq.company} (${eq.color} / مقاس: ${eq.size}) | ${eq.price} ريال`;
        select.appendChild(option);
    });
}

// إضافة المعدة المختارة حقيقياً إلى الفاتورة الحالية
function addSelectedEquipmentToInvoice() {
    const select = document.getElementById('available-equipment-select');
    if (!select || select.value === "") return;
    const eq = localEquipment[select.value];
    
    tempSelectedItems.push(eq);
    
    const previewZone = document.getElementById('selected-items-preview');
    const itemBadge = document.createElement('div');
    itemBadge.style.cssText = "background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; font-size: 14px; display: flex; justify-content: space-between;";
    itemBadge.innerHTML = `<span>🤿 ${eq.type} (${eq.company} - مقاس: ${eq.size})</span> <strong>${eq.price} ريال/يوم</strong>`;
    previewZone.appendChild(itemBadge);
    
    calculateTotal();
}

function calculateTotal() {
    const days = parseFloat(document.getElementById('rental-days').value) || 1;
    const discount = parseFloat(document.getElementById('rental-discount').value) || 0;
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (parseFloat(item.price) * days), 0);
    let total = subtotal - discount;
    document.getElementById('final-total').innerText = total < 0 ? 0 : total;
}

// خاصية البحث الذكي برقم الهوية للعميل
function searchCustomer() {
    const idToSearch = document.getElementById('search-customer-id').value.trim();
    const customer = localCustomers.find(c => c.id === idToSearch);
    
    if (customer) {
        document.getElementById('rental-customer-name').value = customer.name;
        document.getElementById('rental-customer-phone').value = customer.phone;
        alert(`تم العثور على العميل: ${customer.name}`);
    } else {
        alert("عذراً، رقم الهوية غير مسجل بالنظام. الرجاء تسجيل العميل أولاً من صفحة العملاء.");
    }
}

// خاصية البحث الذكي برقم الفاتورة عند الإرجاع
function searchInvoice() {
    const invoiceId = document.getElementById('return-invoice-id').value.trim();
    const rental = localRentals.find(r => r.invoiceId === invoiceId);
    
    if (rental) {
        document.getElementById('ret-cust-name').innerText = rental.customer;
        document.getElementById('ret-cust-phone').innerText = rental.phone || 'غير مسجل';
        document.getElementById('ret-eq-details').innerText = rental.equipmentDetails;
        document.getElementById('ret-total').innerText = rental.total;
        document.getElementById('invoice-details-card').style.display = 'block';
    } else {
        alert("الفاتورة غير موجودة أو تم إغلاقها مسبقاً.");
        document.getElementById('invoice-details-card').style.display = 'none';
    }
}

// دالة عامة لإرسال البيانات لجوجل
async function sendToGoogleSheet(payload) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('ضع_رابط_جوجل_شيت_هنا')) return true;
    try {
        await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return true;
    } catch (e) { console.error(e); return false; }
}

// 1. معالجة حفظ المعدة
document.getElementById('equipment-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const eq = {
        serial: document.getElementById('eq-serial').value,
        company: document.getElementById('eq-company').value,
        type: document.getElementById('eq-type').value,
        size: document.getElementById('eq-size').value,
        color: document.getElementById('eq-color').value,
        price: document.getElementById('eq-price').value
    };
    localEquipment.push(eq);
    localStorage.setItem('localEquipment', JSON.stringify(localEquipment));
    
    await sendToGoogleSheet({ action: 'addEquipment', ...eq });
    alert("تم حفظ المعدة بنجاح بالنظام المحلي وجوجل شيت!");
    this.reset();
});

// 2. معالجة حفظ العميل
document.getElementById('customer-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const cust = {
        id: document.getElementById('cust-id').value,
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        center: document.getElementById('cust-center').value,
        license: document.getElementById('cust-license').value
    };
    localCustomers.push(cust);
    localStorage.setItem('localCustomers', JSON.stringify(localCustomers));
    
    await sendToGoogleSheet({ action: 'addCustomer', customerSerial: cust.id, ...cust });
    alert("تم تسجيل العميل بنجاح!");
    this.reset();
});

// 3. معالجة إصدار الفاتورة وإرسال واتساب
document.getElementById('rental-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (tempSelectedItems.length === 0) { alert("أضف معدات أولاً!"); return; }
    
    const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
    const name = document.getElementById('rental-customer-name').value;
    const phone = document.getElementById('rental-customer-phone').value;
    const days = document.getElementById('rental-days').value;
    const total = document.getElementById('final-total').innerText;
    const eqDetails = tempSelectedItems.map(i => `${i.type} (${i.company} - ${i.size})`).join(', ');
    
    const rentalRecord = {
        invoiceId: invoiceSerial,
        customer: name,
        phone: phone,
        equipmentDetails: eqDetails,
        total: total,
        days: parseInt(days),
        serialsUsed: tempSelectedItems.map(i => i.serial), // لحساب الإحصائيات لاحقاً
        status: 'تحت التأجير'
    };
    
    localRentals.push(rentalRecord);
    localStorage.setItem('localRentals', JSON.stringify(localRentals));
    
    await sendToGoogleSheet({ action: 'addRental', ...rentalRecord, date: new Date().toLocaleDateString('ar-SA') });
    
    const msg = `أهلاً بك في Coral Reef Center 🌊\n\nتم تسجيل فاتورة تأجير رقم (${invoiceSerial}).\n\nالتفاصيل:\n- العميل: ${name}\n- المعدات: ${eqDetails}\n- المدة: ${days} أيام.\n- الإجمالي: ${total} ريال.\n\nنتمنى لك غوصة ممتعة! 🤿`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    
    tempSelectedItems = [];
    document.getElementById('selected-items-preview').innerHTML = '';
    document.getElementById('final-total').innerText = '0';
    this.reset();
});

// 4. معالجة الإرجاع
document.getElementById('return-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const invId = document.getElementById('return-invoice-id').value;
    const isDamaged = document.getElementById('is-damaged-checkbox').checked;
    const damageNote = document.getElementById('damage-note').value;
    
    let rentalIndex = localRentals.findIndex(r => r.invoiceId === invId);
    if(rentalIndex !== -1) {
        localRentals[rentalIndex].status = isDamaged ? `تالفة: ${damageNote}` : 'مستلمة سليمة';
        localStorage.setItem('localRentals', JSON.stringify(localRentals));
    }
    
    await sendToGoogleSheet({ action: 'updateStatus', invoiceId: invId, status: isDamaged ? `تالفة: ${damageNote}` : 'مستلمة سليمة' });
    alert("تم تحديث حالة المستودع بنجاح!");
    this.reset();
    document.getElementById('invoice-details-card').style.display = 'none';
});

// 5. دالة بناء جدول الإحصائيات السنوي الحي للمعدات
function renderStatsTable() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (localEquipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد معدات مسجلة لحساب إحصائياتها.</td></tr>';
        return;
    }
    
    localEquipment.forEach(eq => {
        // حساب كم مرة ظهر سيريال هذه المعدة في الفواتير المسجلة
        let timesRented = 0;
        let totalDaysRented = 0;
        
        localRentals.forEach(rental => {
            if (rental.serialsUsed && rental.serialsUsed.includes(eq.serial)) {
                timesRented++;
                totalDaysRented += rental.days;
            }
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${eq.serial}</code></td>
            <td>${eq.type} (${eq.company} - ${eq.size})</td>
            <td style="color: #ff8c00; font-weight: bold; text-align: center;">${timesRented} مرات</td>
            <td style="color: #00ffcc; font-weight: bold; text-align: center;">${totalDaysRented} يوم</td>
        `;
        tbody.appendChild(row);
    });
}

document.getElementById('is-damaged-checkbox')?.addEventListener('change', function() {
    document.getElementById('damage-note-container').style.display = this.checked ? 'block' : 'none';
});
        console.error("خطأ في إرسال البيانات لجوجل شيت:", error);
        return false;
    }
}

// 5. إدارة نموذج إضافة "المعدات" (المقاس، الشركة، اللون، السيريال)
const equipmentForm = document.getElementById('equipment-form');
if (equipmentForm) {
    equipmentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const payload = {
            action: 'addEquipment',
            serial: document.getElementById('eq-serial').value,
            company: document.getElementById('eq-company').value,
            type: document.getElementById('eq-type').value,
            size: document.getElementById('eq-size').value,
            color: document.getElementById('eq-color').value,
            price: document.getElementById('eq-price').value
        };
        
        alert("جاري حفظ المعدة...");
        await sendToGoogleSheet(payload);
        alert("تم حفظ المعدة بنجاح في النظام!");
        this.reset();
    });
}

// 6. إدارة نموذج إضافة "العملاء"
const customerForm = document.getElementById('customer-form');
if (customerForm) {
    customerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const payload = {
            action: 'addCustomer',
            customerSerial: document.getElementById('cust-serial').value,
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            id: document.getElementById('cust-id').value,
            center: document.getElementById('cust-center').value,
            license: document.getElementById('cust-license').value
        };
        
        alert("جاري حفظ بيانات العميل...");
        await sendToGoogleSheet(payload);
        alert("تم تسجيل العميل بنجاح!");
        this.reset();
    });
}

// 7. إدارة عملية "التأجير" وإرسال رسالة واتساب التلقائية
const rentalForm = document.getElementById('rental-form');
if (rentalForm) {
    // مستمع لتحديث السعر فوراً عند تغيير الأيام أو الخصم
    document.getElementById('rental-days')?.addEventListener('input', calculateTotal);
    document.getElementById('rental-discount')?.addEventListener('input', calculateTotal);

    rentalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (tempSelectedItems.length === 0) {
            alert("الرجاء إضافة معدة واحدة على الأقل للفاتورة!");
            return;
        }
        
        const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
        const total = document.getElementById('final-total').innerText;
        const days = document.getElementById('rental-days').value;
        const customerName = document.getElementById('rental-customer-name').value;
        const customerPhone = document.getElementById('rental-customer-phone').value;
        
        const equipmentDetails = tempSelectedItems.map(i => `${i.type} (${i.company} - مقاس: ${i.size})`).join(', ');
        
        const payload = {
            action: 'addRental',
            invoiceId: invoiceSerial,
            date: new Date().toLocaleDateString('ar-SA'),
            customer: customerName,
            equipmentDetails: equipmentDetails,
            total: total,
            status: 'معلقة (تحت التأجير)'
        };
        
        alert("جاري تسجيل الفاتورة...");
        await sendToGoogleSheet(payload);
        
        // صياغة رسالة الواتساب الفخمة للعميل بدون روابط صور
        const whatsappMessage = `أهلاً بك في Coral Reef Center 🌊\n\nتم تسجيل فاتورة تأجير رقم (${invoiceSerial}) بنجاح.\n\nتفاصيل العملية:\n- العميل: ${customerName}\n- المعدات: ${equipmentDetails}\n- المدة: ${days} أيام.\n- الإجمالي: ${total} ريال.\n\nفي حال استلام جميع المعدات المذكورة أعلاه بحالة سليمة، يرجى الرد على هذه الرسالة بكلمة (تم الاستلام) لتأكيدها بملفك.\n\nنتمنى لك غوصة ممتعة وآمنة! 🤿`;
        
        // فتح الواتساب مباشرة برقم العميل إن وجد أو عام
        const phoneFormatted = customerPhone.replace(/\D/g, '');
        const waUrl = phoneFormatted ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(whatsappMessage)}` : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
        
        window.open(waUrl, '_blank');
        
        // تصفير البيانات بعد النجاح
        tempSelectedItems = [];
        const previewZone = document.getElementById('selected-items-preview');
        if (previewZone) previewZone.innerHTML = '';
        document.getElementById('final-total').innerText = '0';
        this.reset();
        alert("تمت العملية بنجاح وفتح الواتساب!");
    });
}

// دالة مساعدة لإضافة معدة مؤقتاً في الفاتورة الحالية (يتم استدعاؤها من واجهة الأزرار)
function addItemToInvoice(type, company, size, price) {
    tempSelectedItems.push({ type, company, size, price });
    
    // تحديث العرض المرئي للموظف في الصفحة
    const previewZone = document.getElementById('selected-items-preview');
    if (previewZone) {
        const itemBadge = document.createElement('div');
        itemBadge.style.cssText = "background: #1e1e1e; padding: 8px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; font-size: 14px;";
        itemBadge.innerText = `📁 ${type} - ${company} (مقاس: ${size}) | ${price} ريال/يوم`;
        previewZone.appendChild(itemBadge);
    }
    calculateTotal();
}

// 8. إدارة صفحة "الإرجاع والاستلام" ومطالبة الأضرار
const returnForm = document.getElementById('return-form');
if (returnForm) {
    returnForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const invoiceId = document.getElementById('return-invoice-id').value;
        const customerPhone = document.getElementById('return-customer-phone').value;
        const isDamaged = document.getElementById('is-damaged-checkbox').checked;
        const damageNote = document.getElementById('damage-note').value;
        
        let statusText = 'مستلمة (كاملة وسليمة)';
        if (isDamaged) {
            statusText = `تالفة (ملاحظة: ${damageNote})`;
        }
        
        const payload = {
            action: 'updateStatus',
            invoiceId: invoiceId,
            status: statusText
        };
        
        alert("جاري تحديث حالة الفاتورة...");
        await sendToGoogleSheet(payload);
        
        // صياغة رسالة الإرجاع للعميل
        let returnMessage = `تحية من Coral Reef Center 🌊\n\nتم إنهاء وإغلاق الفاتورة رقم (${invoiceId}).\n\n✅ تم استلام المعدات وفحصها بحالة سليمة.\n\nشكراً لتعاملكم معنا ونتطلع لرؤيتكم مجدداً في مغامرة أخرى! 🤿`;
        
        if (isDamaged) {
            returnMessage = `تنبيه من Coral Reef Center 🌊\n\nتم استلام معدات الفاتورة رقم (${invoiceId}).\n\n⚠️ رصد تقرير الفحص الفني وجود تلف/إشكالية في المعدة المرجعة:\n- الملاحظة: ${damageNote}\n\nتم تسجيل الملاحظة بملفكم، وسيتم التواصل معكم من القسم المختص لاحقاً لإرسال تقرير الضرر المخبري. شكراً لتفهمكم.`;
        }
        
        const phoneFormatted = customerPhone.replace(/\D/g, '');
        const waUrl = phoneFormatted ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(returnMessage)}` : `https://wa.me/?text=${encodeURIComponent(returnMessage)}`;
        
        window.open(waUrl, '_blank');
        this.reset();
        alert("تم إغلاق الفاتورة وإرسال التقرير عبر واتساب!");
    });
}

// تفعيل إظهار وإخفاء حقل الملاحظات في الإرجاع تلقائياً عند الضغط على تالفة
const damageCheckbox = document.getElementById('is-damaged-checkbox');
if (damageCheckbox) {
    damageCheckbox.addEventListener('change', function() {
        const noteContainer = document.getElementById('damage-note-container');
        if (noteContainer) {
            noteContainer.style.display = this.checked ? 'block' : 'none';
        }
    });
}

// 9. تفعيل تطبيق الـ PWA (Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered successfully', reg.scope))
            .catch(err => console.log('Service Worker Registration failed', err));
    });
}
