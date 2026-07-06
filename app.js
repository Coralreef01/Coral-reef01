let tempSelectedItems = [];
let localRentals = [];

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

function calculateTotal() {
    let days = document.getElementById('rental-days')?.value || 0;
    let discount = document.getElementById('rental-discount')?.value || 0;
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (item.price * days), 0);
    document.getElementById('final-total').innerText = (subtotal - discount);
}

// دالة إرسال رسالة التأجير
function sendRentalMessage(invoiceId, total, days) {
    const msg = `أهلاً بك في Coral Reef Center 🌊\n\nتم تسجيل فاتورة رقم (${invoiceId}).\nالمدة: ${days} أيام.\nالإجمالي: ${total} ريال.\nيرجى الرد بـ 'تم الاستلام'.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// دالة إرسال رسالة الإرجاع مع كشف الضرر
function sendReturnMessage(invoiceId, isDamaged, damageNote) {
    let msg = `شكراً لتعاونك مع Coral Reef Center! 🤿\nتم استلام المعدات للفاتورة ${invoiceId}.`;
    if(isDamaged) msg += `\n\n⚠️ تنبيه بشأن ضرر في معدة: ${damageNote}. سيتم تقييم الضرر وإبلاغك.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
