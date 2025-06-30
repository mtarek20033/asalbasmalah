# main.py - النسخة المحدثة

from flask import Flask, render_template
from flask_cors import CORS
from api import api_bp

# تهيئة تطبيق Flask مع تحديد مسارات الواجهة الأمامية
# سيقوم فلاسك الآن بالبحث عن ملفات HTML في مجلد 'templates'
# والبحث عن ملفات JavaScript و CSS في مجلد 'static'
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# إعداد CORS (لا يزال مفيداً كإجراء احتياطي)
CORS(app)

# تسجيل الـ Blueprint الخاص بالـ API كما كان
app.register_blueprint(api_bp)


# --- تعديل رئيسي هنا ---
# هذا المسار الجديد سيقوم بعرض صفحة الويب الرئيسية من مجلد templates
@app.route('/')
def serve_app():
    """
    يعرض الواجهة الأمامية الرئيسية للتطبيق (index.html).
    """
    return render_template('index.html')


if __name__ == '__main__':
    # تشغيل الخادم في وضع التطوير
    # الآن عند الدخول إلى http://127.0.0.1:5000 سترى التطبيق مباشرة
    app.run(host='0.0.0.0', port=5000, debug=True)