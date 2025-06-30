from flask import Blueprint, request, jsonify, send_file
from database_api import DatabaseAPI
import traceback
import io
import xlsxwriter

db = DatabaseAPI('store.db')
api_bp = Blueprint('api', __name__, url_prefix='/api')

def log_error(e, endpoint_name):
    print(f"!!! ERROR in endpoint [{endpoint_name}]: {e}")
    traceback.print_exc()

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

# --- Locations Endpoints ---
@api_bp.route('/locations', methods=['GET'])
def get_all_locations():
    try:
        locations = db.get_locations()
        return jsonify({'success': True, 'data': locations})
    except Exception as e:
        log_error(e, 'GET /locations')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/locations', methods=['POST'])
def add_new_location():
    try:
        data = request.get_json()
        if not data or 'governorate' not in data or 'region' not in data:
            return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
        location_id = db.add_location(data['governorate'], data['region'])
        return jsonify({'success': True, 'message': 'تمت إضافة المنطقة بنجاح', 'id': location_id}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 409
    except Exception as e:
        log_error(e, 'POST /locations')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/locations', methods=['DELETE'])
def delete_existing_location():
    try:
        data = request.get_json()
        db.delete_location(data['governorate'], data['region'])
        return jsonify({'success': True, 'message': 'تم حذف المنطقة بنجاح'})
    except Exception as e:
        log_error(e, 'DELETE /locations')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

# --- Categories & Products Endpoints ---
@api_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        categories = db.get_product_categories()
        return jsonify({'success': True, 'data': categories})
    except Exception as e:
        log_error(e, 'GET /categories')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/products', methods=['GET'])
def get_products():
    try:
        products = db.get_products()
        return jsonify({'success': True, 'data': products})
    except Exception as e:
        log_error(e, 'GET /products')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        product_id = db.add_product(data)
        return jsonify({'success': True, 'message': 'تمت إضافة المنتج بنجاح', 'product_id': product_id}), 201
    except Exception as e:
        log_error(e, 'POST /products')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product_endpoint(product_id):
    try:
        data = request.get_json()
        db.update_product(product_id, data)
        return jsonify({'success': True, 'message': 'تم تحديث المنتج بنجاح'})
    except Exception as e:
        log_error(e, f'PUT /products/{product_id}')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product_endpoint(product_id):
    try:
        db.delete_product(product_id)
        return jsonify({'success': True, 'message': 'تم حذف المنتج بنجاح'})
    except Exception as e:
        log_error(e, f'DELETE /products/{product_id}')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

# ===== Supplier & Purchase Endpoints (الجديدة) =====
@api_bp.route('/suppliers', methods=['GET'])
def get_all_suppliers():
    try:
        suppliers = db.get_suppliers()
        return jsonify({'success': True, 'data': suppliers})
    except Exception as e:
        log_error(e, 'GET /suppliers')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/suppliers', methods=['POST'])
def add_new_supplier():
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'success': False, 'error': 'اسم المورد مطلوب'}), 400
        supplier_id = db.add_supplier(data)
        return jsonify({'success': True, 'message': 'تمت إضافة المورد بنجاح', 'id': supplier_id}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 409
    except Exception as e:
        log_error(e, 'POST /suppliers')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/purchases', methods=['POST'])
def create_new_purchase():
    try:
        data = request.get_json()
        purchase_id = db.create_purchase(data)
        # بعد نجاح الإضافة، نعيد تحميل المنتجات للحصول على المخزون المحدث
        products = db.get_products()
        return jsonify({
            'success': True, 
            'message': f'تم تسجيل فاتورة الشراء بنجاح وتحديث المخزون',
            'purchase_id': purchase_id,
            'updated_products': products # إرسال المنتجات المحدثة
        }), 201
    except Exception as e:
        log_error(e, 'POST /purchases')
        return jsonify({'success': False, 'error': 'حدث خطأ أثناء تسجيل فاتورة الشراء'}), 500

# --- Orders Endpoints ---
@api_bp.route('/orders', methods=['GET'])
def get_all_orders():
    try:
        search_query = request.args.get('search', None)
        orders = db.get_orders(search_query)
        return jsonify({'success': True, 'data': orders})
    except Exception as e:
        log_error(e, 'GET /orders')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_single_order(order_id):
    try:
        order = db.get_order_by_id(order_id)
        if order:
            return jsonify({'success': True, 'data': order})
        return jsonify({'success': False, 'error': 'لم يتم العثور على الطلب'}), 404
    except Exception as e:
        log_error(e, f'GET /orders/{order_id}')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/orders', methods=['POST'])
def create_order_endpoint():
    try:
        data = request.get_json()
        invoice = db.create_order(data)
        return jsonify({'success': True, 'message': f'تم حفظ الطلب {invoice}', 'invoice': invoice}), 201
    except Exception as e:
        log_error(e, 'POST /orders')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/orders/<int:order_id>', methods=['PUT'])
def update_order_endpoint(order_id):
    try:
        data = request.get_json()
        db.update_order(order_id, data)
        return jsonify({'success': True, 'message': 'تم تحديث الطلب بنجاح'})
    except Exception as e:
        log_error(e, f'PUT /orders/{order_id}')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

# --- Reports Endpoints ---
@api_bp.route('/reports/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        report_data = db.get_dashboard_report(start_date, end_date)
        return jsonify({'success': True, 'data': report_data})
    except Exception as e:
        log_error(e, 'GET /reports/dashboard')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

@api_bp.route('/reports/detailed_orders', methods=['GET'])
def get_detailed_report_endpoint():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        search_term = request.args.get('search_term')
        
        details = db.get_detailed_orders_report(start_date, end_date, status, search_term)
        return jsonify({'success': True, 'data': details})
    except Exception as e:
        log_error(e, 'GET /reports/detailed_orders')
        return jsonify({'success': False, 'error': 'حدث خطأ في الخادم'}), 500

# --- Customers Export Endpoint ---
@api_bp.route('/customers/export', methods=['GET'])
def export_customers():
    print("[DEBUG] Export customers endpoint was called") # رسالة للتأكد
    try:
        customers = db.get_all_customers()
        
        # إنشاء ملف Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('بيانات العملاء')
        
        # كتابة الرأس
        header = ['الاسم', 'رقم الهاتف', 'المحافظة', 'المنطقة', 'العنوان التفصيلي']
        worksheet.right_to_left()
        worksheet.write_row('A1', header)
        
        # كتابة البيانات
        for row_num, customer in enumerate(customers):
            row_data = [
                customer['CustomerName'],
                customer['PhoneNumber'],
                customer['Governorate'],
                customer['Region'],
                customer['Address']
            ]
            worksheet.write_row(row_num + 1, 0, row_data)
            
        workbook.close()
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            download_name='customers_data.xlsx',
            as_attachment=True
        )
    except Exception as e:
        log_error(e, 'GET /customers/export')
        return jsonify({'success': False, 'error': 'حدث خطأ أثناء تصدير البيانات'}), 500
        
        # --- Backup Endpoint ---
@api_bp.route('/backup', methods=['GET'])
def backup_database_endpoint():
    try:
        backup_file_path = db.create_backup()
        return send_file(
            backup_file_path,
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name='store_backup.db'
        )
    except Exception as e:
        log_error(e, 'GET /backup')
        return jsonify({'success': False, 'error': 'حدث خطأ أثناء إنشاء النسخة الاحتياطية.'}), 500