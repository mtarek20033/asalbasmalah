import sqlite3
from typing import List, Dict
from datetime import datetime, timedelta
import io
import xlsxwriter
import os
import sys
import shutil

class DatabaseAPI:
    def __init__(self, db_path: str):
        # Check if running as a PyInstaller bundle
        if getattr(sys, 'frozen', False):
            # Get the temporary directory where PyInstaller extracts files
            # NOTE: This directory is read-only.
            bundle_dir = getattr(sys, '_MEIPASS', os.path.abspath(os.path.dirname(__file__)))
            source_db_path = os.path.join(bundle_dir, db_path)

            # Get a writable location in the user's documents folder
            # This is a safe place to store user-specific data that can be modified
            documents_path = os.path.join(os.path.expanduser("~"), "Documents", "Assal_Basmalah_Data")
            
            # Create the directory if it doesn't exist
            if not os.path.exists(documents_path):
                os.makedirs(documents_path)

            self.db_path = os.path.join(documents_path, db_path)

            # If the database file doesn't exist in the writable location, copy it from the bundle
            if not os.path.exists(self.db_path):
                # We can now confidently copy the file, as it's the first run
                shutil.copy(source_db_path, self.db_path)
                print(f"Database copied to writable location: {self.db_path}")
            else:
                print(f"Using existing database from: {self.db_path}")
        else:
            # Not running from a bundle (e.g., from source code), use the original path
            self.db_path = db_path

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def get_locations(self) -> Dict:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT Governorate, Region FROM Locations ORDER BY Governorate, Region")
        data = {}
        for row in cursor.fetchall():
            gov, region = row['Governorate'], row['Region']
            if gov not in data:
                data[gov] = []
            data[gov].append(region)
        conn.close()
        return data

    def add_location(self, gov: str, region: str) -> int:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO Locations (Governorate, Region) VALUES (?, ?)", (gov, region))
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            raise ValueError("هذه المنطقة موجودة بالفعل في نفس المحافظة.")
        finally:
            conn.close()

    def delete_location(self, gov: str, region: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Locations WHERE Governorate = ? AND Region = ?", (gov, region))
        conn.commit()
        conn.close()

    def get_product_categories(self) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT CategoryID, CategoryName FROM ProductCategories ORDER BY CategoryName")
        categories = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return categories
    
    def get_products(self) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        query = """
            SELECT p.ProductID, p.ProductName, p.Description, p.CategoryID, c.CategoryName 
            FROM Products p 
            LEFT JOIN ProductCategories c ON p.CategoryID = c.CategoryID 
            WHERE p.IsActive = 1 
            ORDER BY c.CategoryName, p.ProductName
        """
        cursor.execute(query)
        products_list = [dict(row) for row in cursor.fetchall()]
        for product in products_list:
            prices_query = "SELECT PriceID, WeightName, Price, Stock FROM ProductPrices WHERE ProductID = ?"
            cursor.execute(prices_query, (product["ProductID"],))
            product["weights"] = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return products_list

    def add_product(self, data: Dict) -> int:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO Products (ProductName, CategoryID, Description) VALUES (?, ?, ?)",
                           (data['name'], data['category_id'], data.get('description', '')))
            product_id = cursor.lastrowid
            if data.get('weights'):
                price_data = [(product_id, w['name'], w['price'], w.get('stock', 0)) for w in data['weights']]
                cursor.executemany("INSERT INTO ProductPrices (ProductID, WeightName, Price, Stock) VALUES (?, ?, ?, ?)", price_data)
            conn.commit()
            return product_id
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_product(self, product_id: int, data: Dict):
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE Products SET ProductName = ?, CategoryID = ?, Description = ? WHERE ProductID = ?",
                           (data['name'], data['category_id'], data.get('description', ''), product_id))
            
            existing_price_ids = {w['priceId'] for w in data.get('weights', []) if w.get('priceId')}
            if existing_price_ids:
                placeholders = ','.join('?' for _ in existing_price_ids)
                cursor.execute(f"DELETE FROM ProductPrices WHERE ProductID = ? AND PriceID NOT IN ({placeholders})", (product_id, *existing_price_ids))
            else:
                cursor.execute("DELETE FROM ProductPrices WHERE ProductID = ?", (product_id,))

            if data.get('weights'):
                for w in data['weights']:
                    if w.get('priceId'):
                        cursor.execute("UPDATE ProductPrices SET WeightName = ?, Price = ?, Stock = ? WHERE PriceID = ?", 
                                       (w['name'], w['price'], w.get('stock', 0), w['priceId']))
                    else:
                        cursor.execute("INSERT INTO ProductPrices (ProductID, WeightName, Price, Stock) VALUES (?, ?, ?, ?)",
                                       (product_id, w['name'], w['price'], w.get('stock', 0)))
            conn.commit()
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def delete_product(self, product_id: int):
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE Products SET IsActive = 0 WHERE ProductID = ?", (product_id,))
        conn.commit()
        conn.close()
        
    def get_suppliers(self) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT SupplierID, SupplierName, ContactPerson, PhoneNumber FROM Suppliers ORDER BY SupplierName")
        suppliers = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return suppliers

    def add_supplier(self, data: Dict) -> int:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO Suppliers (SupplierName, ContactPerson, PhoneNumber) VALUES (?, ?, ?)",
                           (data['name'], data.get('contact'), data.get('phone')))
            supplier_id = cursor.lastrowid
            conn.commit()
            return supplier_id
        except sqlite3.IntegrityError:
            conn.rollback()
            raise ValueError("اسم المورد موجود بالفعل.")
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def create_purchase(self, data: Dict) -> int:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO Purchases (SupplierID, TotalAmount, Notes) VALUES (?, ?, ?)",
                           (data.get('supplierId'), data['totalAmount'], data.get('notes')))
            purchase_id = cursor.lastrowid

            for item in data['items']:
                cursor.execute("""
                    INSERT INTO PurchaseItems (PurchaseID, PriceID, Quantity, CostPrice, TotalPrice)
                    VALUES (?, ?, ?, ?, ?)
                """, (purchase_id, item['priceId'], item['quantity'], item['costPrice'], item['totalPrice']))

                cursor.execute("UPDATE ProductPrices SET Stock = Stock + ? WHERE PriceID = ?",
                               (item['quantity'], item['priceId']))
            
            conn.commit()
            return purchase_id
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def get_orders(self, search_term: str = None) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        query = "SELECT o.*, c.CustomerName, c.PhoneNumber FROM Orders o LEFT JOIN Customers c ON o.CustomerID = c.CustomerID"
        params = []
        if search_term:
            query += " WHERE (c.CustomerName LIKE ? OR c.PhoneNumber LIKE ? OR o.InvoiceNumber LIKE ?)"
            like_term = f'%{search_term}%'
            params.extend([like_term, like_term, like_term])
        query += " ORDER BY o.OrderDate DESC"
        cursor.execute(query, params)
        orders = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return orders

    def get_order_by_id(self, order_id: int) -> Dict:
        conn = self._get_connection()
        cursor = conn.cursor()
        order_query = "SELECT o.*, c.CustomerName, c.PhoneNumber, c.Governorate, c.Region, c.Address FROM Orders o LEFT JOIN Customers c ON o.CustomerID = c.CustomerID WHERE o.OrderID = ?"
        cursor.execute(order_query, (order_id,))
        order_data = cursor.fetchone()
        if not order_data: return None
        order = dict(order_data)
        items_query = """
            SELECT oi.*, p.ProductName, pp.WeightName, pp.ProductID, pp.Stock 
            FROM OrderItems oi 
            JOIN ProductPrices pp ON oi.PriceID = pp.PriceID 
            JOIN Products p ON pp.ProductID = p.ProductID 
            WHERE oi.OrderID = ?
        """
        cursor.execute(items_query, (order_id,))
        order['items'] = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return order

    def create_order(self, order_data: Dict) -> str:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            customer_id = None
            if order_data.get("customerPhone"):
                cursor.execute("SELECT CustomerID FROM Customers WHERE PhoneNumber = ?", (order_data["customerPhone"],))
                customer = cursor.fetchone()
                if customer: 
                    customer_id = customer["CustomerID"]
                else:
                    cursor.execute("INSERT INTO Customers (CustomerName, PhoneNumber, Governorate, Region, Address) VALUES (?, ?, ?, ?, ?)",
                                   (order_data["customerName"], order_data["customerPhone"], order_data["governorate"], order_data["region"], order_data["address"]))
                    customer_id = cursor.lastrowid
            
            invoice_number = f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{customer_id or 'NA'}"
            
            cursor.execute("""
                INSERT INTO Orders (InvoiceNumber, CustomerID, TotalAmount, ShippingCost, DiscountAmount, FinalAmount, Notes, OrderStatus, CreatedByUserID, PaymentMethod, AmountPaid, PaymentStatus) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,(invoice_number, customer_id, order_data["total"], order_data["shippingCost"], order_data["discount"], order_data["finalTotal"], order_data["notes"], 'جديد', order_data.get('userId', 1), order_data["paymentMethod"], order_data["amountPaid"], order_data["paymentStatus"]))
            order_id = cursor.lastrowid
            
            for item in order_data["items"]:
                cursor.execute("INSERT INTO OrderItems (OrderID, PriceID, Quantity, UnitPrice, TotalPrice) VALUES (?, ?, ?, ?, ?)",
                               (order_id, item["priceId"], item["quantity"], item["unitPrice"], item["totalPrice"]))
                cursor.execute("UPDATE ProductPrices SET Stock = Stock - ? WHERE PriceID = ?", (item["quantity"], item["priceId"]))
            
            conn.commit()
            return invoice_number
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_order(self, order_id: int, order_data: Dict):
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT PriceID, Quantity FROM OrderItems WHERE OrderID = ?", (order_id,))
            old_items = cursor.fetchall()
            for item in old_items:
                cursor.execute("UPDATE ProductPrices SET Stock = Stock + ? WHERE PriceID = ?", (item['Quantity'], item['PriceID']))

            cursor.execute("DELETE FROM OrderItems WHERE OrderID = ?", (order_id,))

            new_status = order_data['status']
            if new_status != 'ملغي' and order_data.get('items'):
                for item in order_data["items"]:
                    cursor.execute("INSERT INTO OrderItems (OrderID, PriceID, Quantity, UnitPrice, TotalPrice) VALUES (?, ?, ?, ?, ?)",
                                   (order_id, item["priceId"], item["quantity"], item["unitPrice"], item["totalPrice"]))
                    cursor.execute("UPDATE ProductPrices SET Stock = Stock - ? WHERE PriceID = ?", (item["quantity"], item["priceId"]))

            cursor.execute("""
                UPDATE Orders SET 
                    TotalAmount = ?, ShippingCost = ?, DiscountAmount = ?, FinalAmount = ?, 
                    Notes = ?, OrderStatus = ?, PaymentMethod = ?, AmountPaid = ?, PaymentStatus = ?
                WHERE OrderID = ? 
            """, (
                order_data['total'], order_data['shippingCost'], order_data['discount'], order_data['finalTotal'], 
                order_data['notes'], new_status, order_data['paymentMethod'], 
                order_data['amountPaid'], order_data['paymentStatus'], order_id
            ))

            conn.commit()
        except sqlite3.Error as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_dashboard_report(self, start_date: str, end_date: str) -> Dict:
        conn = self._get_connection()
        cursor = conn.cursor()
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        if not start_date:
            start_date_dt = datetime.now() - timedelta(days=30)
            start_date = start_date_dt.strftime('%Y-%m-%d')
        end_date_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        params = (start_date, end_date_dt.strftime('%Y-%m-%d'))
        summary_query = "SELECT OrderStatus, COUNT(OrderID) as count, SUM(FinalAmount) as total FROM Orders WHERE OrderDate BETWEEN ? AND ? GROUP BY OrderStatus"
        cursor.execute(summary_query, params)
        report_data = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"statuses": report_data}

    def get_detailed_orders_report(self, start_date: str, end_date: str, status: str, search_term: str) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        query = """
            SELECT o.OrderID, o.InvoiceNumber, o.OrderDate, o.OrderStatus, o.FinalAmount, c.CustomerName, c.PhoneNumber
            FROM Orders o
            LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND o.OrderDate >= ?"
            params.append(start_date)
        
        if end_date:
            end_date_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            # ===== السطر الذي تم تصحيحه =====
            query += " AND o.OrderDate < ?"
            params.append(end_date_dt.strftime('%Y-%m-%d'))

        if status:
            query += " AND o.OrderStatus = ?"
            params.append(status)

        if search_term:
            like_term = f'%{search_term}%'
            query += " AND (c.CustomerName LIKE ? OR c.PhoneNumber LIKE ? OR o.InvoiceNumber LIKE ?)"
            params.extend([like_term, like_term, like_term])
        
        query += " ORDER BY o.OrderDate DESC"
        
        cursor.execute(query, params)
        report = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return report

    def get_all_customers(self) -> List[Dict]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT CustomerName, PhoneNumber, Governorate, Region, Address FROM Customers ORDER BY CustomerName")
        customers = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return customers
    
    def create_backup(self) -> str:
        """
        ينشئ نسخة احتياطية من ملف قاعدة البيانات ويرجع مسارها.
        """
        # نحدد المسار اللي هنحفظ فيه النسخة الاحتياطية.
        # ممكن يكون مجلد فرعي داخل مجلد المستخدم 'Documents' عشان يكون آمن للكتابة.
        backup_dir = os.path.join(os.path.expanduser("~"), "Documents", "Assal_Basmalah_Data", "backups")
        
        # نتأكد إن المجلد موجود، لو مش موجود نعمله.
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        # نعمل اسم للملف بالوقت والتاريخ عشان كل نسخة تبقى باسم مختلف.
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"store_backup_{timestamp}.db"
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # نعمل النسخ الفعلي للملف.
        shutil.copy(self.db_path, backup_path)
        
        print(f"تم إنشاء نسخة احتياطية بنجاح في: {backup_path}")
        
        return backup_path