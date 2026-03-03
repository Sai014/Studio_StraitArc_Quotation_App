# Quotation Management System

A full-stack web application for managing interior design quotations with master data management and PDF generation capabilities.

## Features

- **Admin Page**: Manage master data (Categories, Subcategories, Items)
- **Quotation Page**: Create quotations with dynamic item rows
- **PDF Generation**: Generate professional PDF quotations
- **Auto-calculations**: Automatic amount and grand total calculations
- **Cascading Dropdowns**: Smart filtering of subcategories and items

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **Frontend**: HTML + Vanilla JavaScript
- **PDF Generation**: reportlab
- **Styling**: CSS

## Project Structure

```
Studio_Straitarc/
├── main.py              # FastAPI application and routes
├── models.py            # SQLAlchemy database models
├── database.py          # Database configuration
├── schemas.py           # Pydantic schemas for API
├── pdf_generator.py     # PDF generation logic
├── requirements.txt     # Python dependencies
├── templates/          # HTML templates
│   ├── index.html
│   ├── admin.html
│   └── quotation.html
└── static/             # Static files
    ├── style.css
    ├── admin.js
    └── quotation.js
```

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload
   ```

2. **Access the application:**
   - Open your browser and navigate to: `http://localhost:8000`
   - Home page: `http://localhost:8000/`
   - Admin page: `http://localhost:8000/admin`
   - Quotation page: `http://localhost:8000/quotation`

## Usage

### Admin Page

1. **Create Categories:**
   - Enter category name and click "Add Category"

2. **Create Subcategories:**
   - Select a category
   - Enter subcategory name and click "Add Subcategory"

3. **Create Items:**
   - Select category and subcategory
   - Enter item name, unit of measure (UOM), and rate per unit
   - Click "Add Item"

### Quotation Page

1. **Enter Customer Information:**
   - Customer Name
   - Project Name
   - Date

2. **Add Items:**
   - Click "Add Row" to add a new item row
   - Select Category → Subcategory → Item
   - UOM and Rate are auto-filled
   - Enter Quantity (Amount is auto-calculated)
   - Grand Total updates automatically

3. **Generate PDF:**
   - Click "Generate PDF" button
   - Quotation is saved to database
   - PDF is generated and downloaded

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a category
- `DELETE /api/categories/{category_id}` - Delete a category

### Subcategories
- `GET /api/subcategories/{category_id}` - Get subcategories for a category
- `POST /api/subcategories` - Create a subcategory
- `DELETE /api/subcategories/{subcategory_id}` - Delete a subcategory

### Items
- `GET /api/items/{subcategory_id}` - Get items for a subcategory
- `POST /api/items` - Create an item
- `DELETE /api/items/{item_id}` - Delete an item

### Quotations
- `POST /api/quotation` - Create a quotation
- `GET /api/quotation/{quotation_id}/pdf` - Download quotation PDF

## Database

The application uses SQLite database (`quotation.db`) which is automatically created on first run.

### Tables
- `categories` - Master categories
- `subcategories` - Subcategories linked to categories
- `items` - Items linked to subcategories
- `quotations` - Quotation headers
- `quotation_items` - Quotation line items

## Notes

- The database file (`quotation.db`) will be created automatically in the project root
- All data is stored locally in SQLite
- PDFs are generated on-the-fly and streamed to the browser
- The application runs on `http://localhost:8000` by default

## Troubleshooting

- If you encounter import errors, ensure all dependencies are installed: `pip install -r requirements.txt`
- If the database doesn't initialize, check file permissions in the project directory
- For PDF generation issues, ensure reportlab is properly installed
