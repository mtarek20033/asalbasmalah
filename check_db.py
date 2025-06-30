import sqlite3
import os

DB_FILE = "store.db"
TABLE_TO_CHECK = "Locations"

print("="*50)
print(f"--- بدء فحص قاعدة البيانات '{DB_FILE}' ---")

if not os.path.exists(DB_FILE):
    print(f"!!! خطأ فادح: ملف قاعدة البيانات '{DB_FILE}' غير موجود أصلاً.")
    print("--- انتهاء الفحص ---")
    exit()

try:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    print("تم الاتصال بقاعدة البيانات بنجاح.")

    # 1. التحقق من وجود الجدول
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (TABLE_TO_CHECK,))
    result = cursor.fetchone()

    if result:
        print(f"--> نتيجة الفحص (1): جدول '{TABLE_TO_CHECK}' موجود بالفعل. هذا مؤشر جيد.")
        
        # 2. محاولة قراءة البيانات منه
        try:
            cursor.execute(f"SELECT * FROM {TABLE_TO_CHECK} LIMIT 3")
            rows = cursor.fetchall()
            print(f"--> نتيجة الفحص (2): نجحت قراءة البيانات من جدول '{TABLE_TO_CHECK}'.")
            print(f"    - تم العثور على عدد {len(rows)} صف/صفوف.")
            if rows:
                print(f"    - مثال للبيانات الموجودة: {rows}")
        except Exception as e:
            print(f"!!! خطأ في الفحص (2): الجدول موجود ولكن فشلت محاولة قراءة البيانات منه. الخطأ: {e}")

    else:
        print(f"!!! خطأ في الفحص (1): جدول '{TABLE_TO_CHECK}' غير موجود في قاعدة البيانات.")
        print("    - هذا هو سبب المشكلة الرئيسية. يبدو أن عملية إعادة بناء قاعدة البيانات لم تتم بنجاح.")

    conn.close()

except Exception as e:
    print(f"!!! حدث خطأ فادح وغير متوقع أثناء الفحص: {e}")

print("--- انتهاء الفحص ---")
print("="*50)