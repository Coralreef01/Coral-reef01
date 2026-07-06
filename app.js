// 1. إعدادات المتغيرات العامة ورابط جوجل شيت
// ضع رابط الـ Web App الطويل الذي نسخته من جوجل شيت بين العلامتين ''
const GOOGLE_SCRIPT_URL = 'ضع_رابط_جوجل_شيت_هنا'; 

let tempSelectedItems = []; // لتخزين المعدات المؤقتة أثناء تسجيل فاتورة جديدة

// 2. دالة التنقل بين الصفحات (حل مشكلة عدم الانتقال الفوري)
function showPage(pageId) {
    // إخفاء جميع الصفحات قسراً
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => {
        page.style.setProperty('display', 'none', 'important');
    });
    
    // إظهار الصفحة المطلوبة فوراً
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.setProperty('display', 'block', 'important');
        window.scrollTo(0, 0); // العودة لأعلى الصفحة
    } else {
        console.error("الصفحة المطلوبة غير موجودة: " + pageId);
    }
}

// تشغيل أول صفحة تلقائياً عند فتح التطبيق
window.addEventListener('DOMContentLoaded', () => {
    showPage('equipment-page');
});

// 3. حساب إجمالي الفاتورة تلقائياً (الأساسي - الخصم)
function calculateTotal() {
    const daysInput = document.getElementById('rental-days');
    const discountInput = document.getElementById('rental-discount');
    const totalDisplay = document.getElementById('final-total');
    
    if (!daysInput || !totalDisplay) return;
    
    let days = parseFloat(daysInput.value) || 0;
    let discount = parseFloat(discountInput.value) || 0;
    
    // حساب مجموع أسعار المعدات المضافة بناءً على الأيام
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (parseFloat(item.price) * days), 0);
    let total = subtotal - discount;
    
    if (total < 0) total = 0; // منع الأرقام السالبة
    
    totalDisplay.innerText = total;
}

// 4. إرسال البيانات إلى جوجل شيت (دالة عامة للأمان والسرعة)
async function sendToGoogleSheet(payload) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('ضع_رابط_جوجل_شيت_هنا')) {
        console.warn("تنبيه: لم يتم ربط رابط جوجل شيت في كود app.js بعد.");
        return true; 
    }
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // لتفادي مشاكل الحماية أثناء الرفع التجريبي
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
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
