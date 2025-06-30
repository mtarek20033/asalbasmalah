import sqlite3
import os

# ==================== الإعدادات الأساسية ====================
DB_FILE = "store.db"
SCHEMA_FILE = "database_design.sql"

# ==================== بيانات المنتجات من قائمة الأسعار ====================
PRODUCTS_DATA = [
    {"category": "أعسال", "name": "عسل زهرة البرسيم", "weights": [{"name": "كيلو", "price": 600}, {"name": "نص", "price": 300}, {"name": "ربع", "price": 150}]},
    {"category": "أعسال", "name": "عسل زهرة الموالح", "weights": [{"name": "كيلو", "price": 700}, {"name": "نص", "price": 350}, {"name": "ربع", "price": 170}]},
    {"category": "أعسال", "name": "عسل زهرة حبة البركة", "weights": [{"name": "كيلو", "price": 700}, {"name": "نص", "price": 350}]},
    {"category": "أعسال", "name": "عسل زهرة الاعشاب", "weights": [{"name": "كيلو", "price": 1240}, {"name": "نص", "price": 620}, {"name": "ربع", "price": 310}]},
    {"category": "أعسال", "name": "عسل التمر", "weights": [{"name": "كيلو", "price": 600}, {"name": "نص", "price": 300}]},
    {"category": "أعسال", "name": "شمع العسل (برسيم - اعشاب)", "weights": [{"name": "علبة", "price": 20}]},
    {"category": "أعسال", "name": "عسل زهرة السدر الجبلي (مصري)", "weights": [{"name": "جرام", "price": 200}, {"name": "كيس", "price": 15}, {"name": "علبة", "price": 120}]},
    {"category": "أعسال", "name": "عسل زهرة الزعتر", "weights": [{"name": "علبة", "price": 80}]},
    {"category": "خلطات", "name": "خلطة العريس", "weights": [{"name": "كيلو", "price": 240}, {"name": "نص", "price": 120}]},
    {"category": "خلطات", "name": "خلطة الانجاب رجالي", "weights": [{"name": "كيلو", "price": 300}, {"name": "نص", "price": 150}]},
    {"category": "خلطات", "name": "خلطة الانجاب حريمي", "weights": [{"name": "كيلو", "price": 300}, {"name": "نص", "price": 150}]},
    {"category": "خلطات", "name": "خلطة (جرثومة المعده - القولون)", "weights": [{"name": "كيلو", "price": 300}, {"name": "نص", "price": 150}]},
    {"category": "خلطات", "name": "خلطة زيادة الوزن (الانيميا)", "weights": [{"name": "نص", "price": 300}, {"name": "ربع", "price": 150}]},
    {"category": "خلطات", "name": "خلطة المناعه بـ عسل سدر جبلي", "weights": [{"name": "نص", "price": 250}, {"name": "ربع", "price": 125}]},
    {"category": "خلطات", "name": "علبة السعادة الزوجية 12 كيس VIP", "weights": [{"name": "علبة", "price": 600}]},
    {"category": "خلطات", "name": "علبة السعادة الزوجية 12 كيس", "weights": [{"name": "علبة", "price": 300}]},
    {"category": "منتجات مصنعة", "name": "زيت زيتون بكر معصور ع البارد", "weights": [{"name": "350 جرام", "price": 80}]},
    {"category": "منتجات مصنعة", "name": "عسل بالمكسرات", "weights": [{"name": "350 جرام", "price": 50}]},
    {"category": "زيوت وأعشاب", "name": "زيت نعناع - زيت جرجير- زيت سمسم بكر", "weights": [{"name": "علبة", "price": 50}]},
    {"category": "زيوت وأعشاب", "name": "ماكة - عشبة العنزة - قسط هندي", "weights": [{"name": "علبة", "price": 50}]},
    {"category": "مكملات غذائية", "name": "عكبر اوصمغ النحل (بروبليس) 5 جرام", "weights": [{"name": "علبة", "price": 80}]},
    {"category": "مكملات غذائية", "name": "حبوب اللقاح 25 جرام", "weights": [{"name": "علبة", "price": 30}]},
    {"category": "مكملات غذائية", "name": "غذاء الملكات 5 جرام", "weights": [{"name": "علبة", "price": 50}]},
    {"category": "مكملات غذائية", "name": "جنسينج كوري احمر 5 جرام", "weights": [{"name": "علبة", "price": 50}]},
    {"category": "مكملات غذائية", "name": "اشواجندا 5 جرام", "weights": [{"name": "علبة", "price": 40}]}
]

# ==================== بيانات المناطق والمحافظات الشاملة ====================
LOCATIONS_DATA = {
    "القاهرة": ["مصر الجديدة", "النزهة", "مدينة نصر", "شبرا", "الزيتون", "عين شمس", "المطرية", "المرج", "السلام", "الوايلي", "باب الشعرية", "وسط البلد", "عابدين", "موسكي", "الخليفة", "المقطم", "البساتين", "دار السلام", "حلوان", "التبين", "15 مايو", "المعادي", "طره", "السيدة زينب", "مصر القديمة", "الزمالك", "جاردن سيتي", "التحرير", "القاهرة الجديدة", "التجمع الخامس", "التجمع الاول", "الرحاب", "مدينتي", "الشروق", "بدر", "القاهرة"],
    "الجيزة": ["الجيزة", "الهرم", "فيصل", "إمبابة", "بولاق الدكرور", "العمرانية", "الطالبية", "الدقي", "العجوزة", "المهندسين", "الوراق", "أوسيم", "كرداسة", "أبو النمرس", "الحوامدية", "البدرشين", "العياط", "الصف", "أطفيح", "الواحات البحرية", "منشأة القناطر", "6 أكتوبر", "الشيخ زايد", "حدائق أكتوبر"],
    "الإسكندرية": ["المنتزه", "شرق", "وسط", "غرب", "الجمرك", "العامرية", "الدخيلة", "برج العرب", "سيدي جابر", "سموحة", "ميامي", "العصافرة", "المندرة", "فيكتوريا", "محرم بك", "السيوف", "أبو قير", "رشدي", "لوران"],
    "القليوبية": ["بنها", "قليوب", "شبرا الخيمة", "القناطر الخيرية", "الخانكة", "كفر شكر", "طوخ", "الخصوص", "العبور", "قها", "شبين القناطر"]
}


def initialize_database():
    """
    يقوم هذا السكربت الموحد بتجهيز قاعدة البيانات بالكامل:
    1. يحذف قاعدة البيانات القديمة لضمان بداية نظيفة.
    2. ينشئ الجداول من ملف التصميم.
    3. يضيف البيانات الأولية للمنتجات والفئات والمستخدمين والمناطق.
    """
    # --- الخطوة الأولى: بناء الجداول ---
    print("-" * 50)
    print("الخطوة 1: بدء بناء هيكل قاعدة البيانات...")
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
        print(f"تم حذف قاعدة البيانات القديمة '{DB_FILE}'.")

    try:
        with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        conn = sqlite3.connect(DB_FILE)
        conn.execute("PRAGMA foreign_keys = ON;")
        cursor = conn.cursor()
        cursor.executescript(sql_script)
        conn.commit()
        print("تم بناء الجداول بنجاح.")
        
    except FileNotFoundError:
        print(f"خطأ فادح: ملف التصميم '{SCHEMA_FILE}' غير موجود. لا يمكن المتابعة.")
        return
    except Exception as e:
        print(f"حدث خطأ فادح أثناء بناء الجداول: {e}")
        return
    finally:
        if conn:
            conn.close()

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # --- الخطوة الثانية: تعبئة المنتجات ---
    print("-" * 50)
    print("الخطوة 2: بدء إضافة المنتجات إلى قاعدة البيانات...")
    try:
        product_count = 0
        for product_info in PRODUCTS_DATA:
            cursor.execute("SELECT CategoryID FROM ProductCategories WHERE CategoryName = ?", (product_info["category"],))
            category_result = cursor.fetchone()
            if not category_result:
                print(f"تحذير: لم يتم العثور على الفئة: {product_info['category']}. يتم التخطي.")
                continue
            category_id = category_result[0]

            cursor.execute("INSERT INTO Products (ProductName, CategoryID) VALUES (?, ?)", 
                           (product_info["name"], category_id))
            product_id = cursor.lastrowid
            
            for weight_info in product_info["weights"]:
                cursor.execute("INSERT INTO ProductPrices (ProductID, WeightName, Price, Stock) VALUES (?, ?, ?, ?)",
                               (product_id, weight_info["name"], weight_info["price"], 100)) # Default stock 100
            product_count += 1

        conn.commit()
        print(f"تمت إضافة {product_count} منتج بنجاح.")

    except sqlite3.Error as e:
        print(f"حدث خطأ فادح أثناء إضافة المنتجات: {e}")
        conn.rollback()

    # --- الخطوة الثالثة: تعبئة المناطق والمحافظات ---
    print("-" * 50)
    print("الخطوة 3: بدء إضافة المناطق والمحافظات...")
    try:
        location_count = 0
        for governorate, regions in LOCATIONS_DATA.items():
            for region in regions:
                cursor.execute("INSERT INTO Locations (Governorate, Region) VALUES (?, ?)", (governorate, region))
                location_count += 1
        conn.commit()
        print(f"تمت إضافة {location_count} منطقة بنجاح.")
    except sqlite3.Error as e:
        print(f"حدث خطأ فادح أثناء إضافة المناطق: {e}")
        conn.rollback()
    
    finally:
        if conn:
            conn.close()

    print("-" * 50)
    print("اكتمل تجهيز قاعدة البيانات بنجاح.")
    print("يمكنك الآن تشغيل الخادم الرئيسي 'main.py'.")
    print("-" * 50)


if __name__ == "__main__":
    initialize_database()