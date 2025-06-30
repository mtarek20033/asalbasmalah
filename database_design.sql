-- تصميم قاعدة بيانات محل عسل بسملة (الإصدار 5.0)
-- Database Design for Asal Basmalah Store (Version 5.0)

-- يتم حذف الجداول بالترتيب العكسي لتجنب مشاكل العلاقات
DROP TABLE IF EXISTS PurchaseItems;
DROP TABLE IF EXISTS OrderItems;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS StockMovements;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS ProductPrices;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS ProductCategories;
DROP TABLE IF EXISTS Purchases;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Customers;
DROP TABLE IF EXISTS Suppliers;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Settings;
DROP TABLE IF EXISTS Locations;


-- جدول فئات المنتجات
CREATE TABLE ProductCategories (
    CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description TEXT
);

-- جدول المنتجات
CREATE TABLE Products (
    ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName NVARCHAR(100) NOT NULL,
    CategoryID INTEGER,
    Description TEXT,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CategoryID) REFERENCES ProductCategories(CategoryID)
);

-- جدول أسعار وأوزان المنتجات
CREATE TABLE ProductPrices (
    PriceID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductID INTEGER NOT NULL,
    WeightName NVARCHAR(50) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    Stock INTEGER DEFAULT 0,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE
);

-- جدول الطلبات (تمت إضافة حقول الدفع)
CREATE TABLE Orders (
    OrderID INTEGER PRIMARY KEY AUTOINCREMENT,
    InvoiceNumber TEXT NOT NULL UNIQUE,
    CustomerID INTEGER,
    OrderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    OrderStatus NVARCHAR(50) DEFAULT 'جديد',
    TotalAmount DECIMAL(10, 2) DEFAULT 0,
    ShippingCost DECIMAL(10, 2) DEFAULT 0,
    DiscountAmount DECIMAL(10, 2) DEFAULT 0,
    FinalAmount DECIMAL(10, 2) DEFAULT 0,
    -- حقول الدفع الجديدة
    PaymentMethod NVARCHAR(50) DEFAULT 'كاش',
    AmountPaid DECIMAL(10, 2) DEFAULT 0,
    PaymentStatus NVARCHAR(50) DEFAULT 'لم يدفع',
    -- نهاية الحقول الجديدة
    Notes TEXT,
    CreatedByUserID INTEGER,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
    FOREIGN KEY (CreatedByUserID) REFERENCES Users(UserID)
);

-- جدول تفاصيل الطلبات
CREATE TABLE OrderItems (
    OrderItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    PriceID INTEGER NOT NULL,
    Quantity INTEGER NOT NULL,
    UnitPrice DECIMAL(10, 2) NOT NULL,
    TotalPrice DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (PriceID) REFERENCES ProductPrices(PriceID)
);

-- جدول العملاء
CREATE TABLE Customers (
    CustomerID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerName NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20) UNIQUE,
    Governorate NVARCHAR(100),
    Region NVARCHAR(100),
    Address TEXT
);

-- جدول المستخدمين
CREATE TABLE Users (
    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password TEXT NOT NULL,
    FullName NVARCHAR(100),
    Role NVARCHAR(50) DEFAULT 'موظف',
    IsActive BIT DEFAULT 1
);

-- جدول الإعدادات
CREATE TABLE Settings (
    SettingKey NVARCHAR(50) PRIMARY KEY,
    SettingValue TEXT,
    Description TEXT
);

-- جدول المناطق
CREATE TABLE Locations (
    LocationID INTEGER PRIMARY KEY AUTOINCREMENT,
    Governorate NVARCHAR(100) NOT NULL,
    Region NVARCHAR(100) NOT NULL,
    UNIQUE(Governorate, Region)
);

-- ===================================================
--      إضافات خاصة بإدارة الموردين والمشتريات
-- ===================================================

-- جدول الموردين
CREATE TABLE Suppliers (
    SupplierID INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierName NVARCHAR(100) NOT NULL UNIQUE,
    ContactPerson NVARCHAR(100),
    PhoneNumber NVARCHAR(20)
);

-- جدول المشتريات الرئيسية
CREATE TABLE Purchases (
    PurchaseID INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierID INTEGER,
    PurchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    Notes TEXT,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
);

-- جدول تفاصيل المشتريات (الأصناف المشتراة)
CREATE TABLE PurchaseItems (
    PurchaseItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    PurchaseID INTEGER NOT NULL,
    PriceID INTEGER NOT NULL,
    Quantity INTEGER NOT NULL,
    CostPrice DECIMAL(10, 2) NOT NULL,
    TotalPrice DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (PurchaseID) REFERENCES Purchases(PurchaseID) ON DELETE CASCADE,
    FOREIGN KEY (PriceID) REFERENCES ProductPrices(PriceID)
);


-- إدراج بيانات أولية
INSERT INTO ProductCategories (CategoryName) VALUES ('أعسال'), ('خلطات'), ('مكملات غذائية'), ('زيوت وأعشاب'), ('منتجات مصنعة'), ('أخرى');
INSERT INTO Settings (SettingKey, SettingValue) VALUES ('StoreName', 'عسل بسملة'), ('StorePhone', '01114110091'), ('StoreAddress', 'مصر'), ('Currency', 'جنيه');
INSERT INTO Users (Username, Password, FullName, Role) VALUES ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'المدير العام', 'مدير'); -- pw: admin