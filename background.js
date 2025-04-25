// خلفية الامتداد - تدير حالة التفعيل/التعطيل وتتواصل مع سكريبت المحتوى

// تهيئة الإعدادات الافتراضية عند تثبيت الامتداد
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    isEnabled: true,                // تفعيل الامتداد افتراضياً
    autoDetectArabic: true,         // تفعيل الكشف التلقائي عن المحتوى العربي
    minArabicTextPercentage: 15,    // النسبة المئوية الدنيا للنص العربي لتفعيل الامتداد
    whitelistedDomains: [],         // المواقع المسموح بها دائماً
    blacklistedDomains: []          // المواقع المحظورة دائماً
  });
});

// الاستماع لرسائل من سكريبت المحتوى أو واجهة المستخدم
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // طلب الحصول على الإعدادات الحالية
  if (message.action === "getSettings") {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true; // للسماح بالرد غير المتزامن
  }
  
  // تحديث الإعدادات
  else if (message.action === "updateSettings") {
    chrome.storage.sync.set(message.settings, () => {
      // إرسال الإعدادات المحدثة إلى جميع علامات التبويب النشطة
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "settingsUpdated",
            settings: message.settings
          }).catch(() => {
            // تجاهل أخطاء الاتصال مع علامات التبويب غير المتوافقة
          });
        });
      });
      sendResponse({ success: true });
    });
    return true; // للسماح بالرد غير المتزامن
  }
  
  // إبلاغ عن حالة الكشف عن المحتوى العربي
  else if (message.action === "reportArabicDetection") {
    // تخزين نتيجة الكشف مؤقتاً لعلامة التبويب الحالية
    const tabId = sender.tab.id;
    const domain = new URL(sender.tab.url).hostname;
    
    // يمكن استخدام هذه المعلومات لتحديث واجهة المستخدم أو لاتخاذ قرارات مستقبلية
    chrome.storage.local.set({
      [`tabInfo_${tabId}`]: {
        domain: domain,
        hasArabicContent: message.hasArabicContent,
        arabicPercentage: message.arabicPercentage,
        timestamp: Date.now()
      }
    });
    
    sendResponse({ received: true });
    return true;
  }
});

// تنظيف البيانات المؤقتة عند إغلاق علامة التبويب
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`tabInfo_${tabId}`);
});
