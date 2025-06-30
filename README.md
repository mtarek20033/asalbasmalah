# Asal Basmalah Store Management System

A comprehensive store management system built for "Asal Basmalah" honey store, featuring order management, inventory tracking, customer management, and reporting capabilities.

## Features

- **Order Management**: Create, edit, and track orders with customer information
- **Inventory Management**: Track products, stock levels, and low stock alerts
- **Customer Management**: Store and search customer information
- **Reporting**: Sales reports and analytics
- **Print Invoices**: Generate and print order invoices
- **Arabic Interface**: Fully localized Arabic user interface

## Technology Stack

### Backend
- **Flask** - Python web framework
- **SQLite** - Local database
- **Flask-CORS** - Cross-origin resource sharing
- **Python 3.11** - Programming language

### Frontend
- **HTML5** - Markup
- **CSS3 + Tailwind CSS** - Styling
- **JavaScript ES6+** - Client-side logic
- **Font Awesome** - Icons
- **Responsive Design** - Mobile-friendly

## Installation

### Prerequisites
- Python 3.11 or higher
- pip (Python package installer)

### Setup Instructions

1. **Clone or extract the project:**
   ```bash
   cd asal_basmalah_backend
   ```

2. **Activate virtual environment:**
   ```bash
   # On Linux/Mac
   source venv/bin/activate
   
   # On Windows
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python src/main.py
   ```

5. **Access the application:**
   Open your browser and navigate to `http://localhost:5001`

## Project Structure

```
asal_basmalah_backend/
├── src/
│   ├── main.py                 # Main Flask application
│   ├── routes/
│   │   └── api.py             # API routes
│   ├── static/
│   │   ├── index.html         # Main HTML file
│   │   ├── app.js             # JavaScript application
│   │   └── style.css          # CSS styles
│   ├── database_api.py        # Database access layer
│   └── assalmasmalah.db       # SQLite database
├── venv/                      # Virtual environment
└── requirements.txt           # Python dependencies
```

## Database Schema

The system uses SQLite with 13 interconnected tables:

- **Customers** - Customer information
- **ProductCategories** - Product categories
- **Products** - Product details
- **Inventory** - Stock levels
- **InventoryMovements** - Stock movement history
- **Orders** - Order headers
- **OrderItems** - Order line items
- **Payments** - Payment records
- **Suppliers** - Supplier information
- **Purchases** - Purchase orders
- **PurchaseItems** - Purchase line items
- **Users** - System users
- **Settings** - System configuration

## API Endpoints

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create new order
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}` - Update order
- `DELETE /api/orders/{id}` - Delete order

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create new product
- `PUT /api/products/{id}` - Update product
- `GET /api/products/categories` - List categories
- `GET /api/products/low-stock` - Get low stock alerts

### Customers
- `GET /api/customers` - Search customers
- `POST /api/customers` - Create customer

### Reports
- `GET /api/reports/sales` - Sales reports

### System
- `GET /api/health` - Health check
- `GET /api/settings` - Get settings
- `PUT /api/settings/{key}` - Update setting

## Development

### Adding New Features

1. **Backend (API)**: Add new routes in `src/routes/api.py`
2. **Database**: Modify `src/database_api.py` for data access
3. **Frontend**: Update `src/static/app.js` for UI logic
4. **Styling**: Modify `src/static/index.html` and CSS

### Database Modifications

To modify the database schema:
1. Update the SQL in `setup_database.py`
2. Delete the existing `assalmasmalah.db` file
3. Run the setup script to recreate the database

### Testing

The system includes sample data for testing:
- 5 product categories
- 5 sample products
- 1 admin user (admin/admin123)
- Basic system settings

## Configuration

### Environment Variables
- `FLASK_ENV` - Set to 'development' for debug mode
- `DATABASE_PATH` - Custom database file path (optional)

### Settings
System settings can be configured through the web interface or directly in the database:
- Store name, phone, address
- Currency settings
- Tax rates

## Deployment

### Local Deployment
The system is designed to run locally and doesn't require internet connectivity for core functionality.

### Production Considerations
- Use a production WSGI server (e.g., Gunicorn)
- Set up proper backup procedures for the database
- Configure appropriate security measures
- Consider using PostgreSQL for larger deployments

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `main.py`
2. **Database errors**: Check file permissions and path
3. **CORS issues**: Ensure Flask-CORS is properly configured
4. **JavaScript errors**: Check browser console for details

### Logs
Application logs are printed to the console when running in development mode.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software developed for Asal Basmalah store.

## Support

For technical support or questions about the system, please refer to the user documentation or contact the development team.

---

**Note**: This system is designed specifically for Asal Basmalah store and may require customization for other use cases.

