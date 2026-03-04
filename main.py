from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import List, Optional
import io

from database import get_db, init_db
from models import Category, Subcategory, Item, Quotation, QuotationItem
from schemas import (
    CategoryCreate, CategoryResponse,
    SubcategoryCreate, SubcategoryResponse,
    ItemCreate, ItemUpdate, ItemResponse, ItemDetailResponse,
    QuotationCreate, QuotationItemCreate, QuotationResponse,
    QuotationUpdate, QuotationListItem
)
from pdf_generator import generate_quotation_pdf

app = FastAPI(title="Quotation Management System")

# Initialize database
init_db()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")


# ==================== FRONTEND ROUTES ====================

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/quotation", response_class=HTMLResponse)
async def quotation_page(request: Request):
    return templates.TemplateResponse("quotation.html", {"request": request})


@app.get("/quotations", response_class=HTMLResponse)
async def quotations_list_page(request: Request):
    return templates.TemplateResponse("quotations_list.html", {"request": request})


# ==================== API ENDPOINTS ====================

# Categories
@app.get("/api/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories


@app.post("/api/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    # Check if category already exists
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    db_category = Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}


# Subcategories
@app.get("/api/subcategories/{category_id}", response_model=List[SubcategoryResponse])
async def get_subcategories(category_id: int, db: Session = Depends(get_db)):
    subcategories = db.query(Subcategory).filter(Subcategory.category_id == category_id).all()
    return subcategories


@app.post("/api/subcategories", response_model=SubcategoryResponse)
async def create_subcategory(subcategory: SubcategoryCreate, db: Session = Depends(get_db)):
    # Verify category exists
    category = db.query(Category).filter(Category.id == subcategory.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_subcategory = Subcategory(**subcategory.model_dump())
    db.add(db_subcategory)
    db.commit()
    db.refresh(db_subcategory)
    return db_subcategory


@app.delete("/api/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: int, db: Session = Depends(get_db)):
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    db.delete(subcategory)
    db.commit()
    return {"message": "Subcategory deleted successfully"}


# Items
@app.get("/api/items/{subcategory_id}", response_model=List[ItemResponse])
async def get_items(subcategory_id: int, db: Session = Depends(get_db)):
    items = db.query(Item).filter(Item.subcategory_id == subcategory_id).all()
    return items


@app.post("/api/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    # Verify subcategory exists
    subcategory = db.query(Subcategory).filter(Subcategory.id == item.subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/items/detail/{item_id}", response_model=ItemDetailResponse)
async def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    """Get a single item with full details including category and subcategory names"""
    item = db.query(Item).join(Subcategory).join(Category).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {
        "id": item.id,
        "name": item.name,
        "subcategory_id": item.subcategory_id,
        "subcategory_name": item.subcategory.name,
        "category_id": item.subcategory.category_id,
        "category_name": item.subcategory.category.name,
        "uom": item.uom,
        "rate": item.rate
    }


@app.put("/api/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item_update: ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update fields if provided
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.subcategory_id is not None:
        # Verify subcategory exists
        subcategory = db.query(Subcategory).filter(Subcategory.id == item_update.subcategory_id).first()
        if not subcategory:
            raise HTTPException(status_code=404, detail="Subcategory not found")
        item.subcategory_id = item_update.subcategory_id
    if item_update.uom is not None:
        item.uom = item_update.uom
    if item_update.rate is not None:
        item.rate = item_update.rate
    
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/items/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@app.get("/api/items/search/{search_term}", response_model=List[ItemDetailResponse])
async def search_items(search_term: str, db: Session = Depends(get_db)):
    """Search for items by name and return full details including category and subcategory
    Supports partial word matching - e.g., 'shoe' will match 'shoe rack'
    """
    # Decode URL-encoded search term
    from urllib.parse import unquote
    search_term = unquote(search_term).strip()
    
    if not search_term:
        return []
    
    # Query items with relationships loaded
    # Use ilike for case-insensitive partial matching
    # This will match "shoe" in "shoe rack", "wooden" in "wooden beading", etc.
    items = db.query(Item).join(Subcategory).join(Category).filter(
        Item.name.ilike(f"%{search_term}%")
    ).all()
    
    # Convert to response format with category and subcategory names
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "subcategory_id": item.subcategory_id,
            "subcategory_name": item.subcategory.name,
            "category_id": item.subcategory.category_id,
            "category_name": item.subcategory.category.name,
            "uom": item.uom,
            "rate": item.rate
        })
    
    return result


# Quotations
@app.get("/api/quotations", response_model=List[QuotationListItem])
async def get_all_quotations(db: Session = Depends(get_db)):
    """Get all quotations with total amount"""
    quotations = db.query(Quotation).order_by(Quotation.created_at.desc()).all()
    result = []
    for q in quotations:
        total = sum(item.amount for item in q.items)
        result.append({
            "id": q.id,
            "customer_name": q.customer_name,
            "project_name": q.project_name,
            "date": q.date,
            "created_at": q.created_at,
            "total_amount": total
        })
    return result


@app.get("/api/quotation/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Get a single quotation by ID"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@app.post("/api/quotation", response_model=QuotationResponse)
async def create_quotation(quotation: QuotationCreate, db: Session = Depends(get_db)):
    # Create quotation
    db_quotation = Quotation(
        customer_name=quotation.customer_name,
        project_name=quotation.project_name,
        date=quotation.date
    )
    db.add(db_quotation)
    db.flush()  # Get the ID without committing
    
    # Create quotation items
    for item_data in quotation.items:
        db_item = QuotationItem(
            quotation_id=db_quotation.id,
            category_name=item_data.category_name,
            subcategory_name=item_data.subcategory_name,
            item_name=item_data.item_name,
            uom=item_data.uom,
            quantity=item_data.quantity,
            rate=item_data.rate,
            amount=item_data.amount
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_quotation)
    return db_quotation


@app.put("/api/quotation/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(quotation_id: int, quotation: QuotationUpdate, db: Session = Depends(get_db)):
    """Update an existing quotation"""
    db_quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not db_quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Update quotation fields if provided
    if quotation.customer_name is not None:
        db_quotation.customer_name = quotation.customer_name
    if quotation.project_name is not None:
        db_quotation.project_name = quotation.project_name
    if quotation.date is not None:
        db_quotation.date = quotation.date
    
    # Update items if provided
    if quotation.items is not None:
        # Delete existing items
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()
        
        # Add new items
        for item_data in quotation.items:
            db_item = QuotationItem(
                quotation_id=db_quotation.id,
                category_name=item_data.category_name,
                subcategory_name=item_data.subcategory_name,
                item_name=item_data.item_name,
                uom=item_data.uom,
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=item_data.amount
            )
            db.add(db_item)
    
    db.commit()
    db.refresh(db_quotation)
    return db_quotation


@app.delete("/api/quotation/{quotation_id}")
async def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Delete a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    db.delete(quotation)
    db.commit()
    return {"message": "Quotation deleted successfully"}


@app.get("/api/quotation/{quotation_id}/pdf")
async def get_quotation_pdf(
    quotation_id: int, 
    db: Session = Depends(get_db),
    showSNo: Optional[bool] = True,
    showSubcategory: Optional[bool] = True,
    showItem: Optional[bool] = True,
    showUOM: Optional[bool] = True,
    showRate: Optional[bool] = True,
    showQty: Optional[bool] = True,
    showAmount: Optional[bool] = True
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Build column visibility dictionary
    column_visibility = {
        "showSNo": showSNo,
        "showSubcategory": showSubcategory,
        "showItem": showItem,
        "showUOM": showUOM,
        "showRate": showRate,
        "showQty": showQty,
        "showAmount": showAmount
    }
    
    # Generate PDF with column visibility settings
    pdf_buffer = generate_quotation_pdf(quotation, column_visibility)
    
    # Return PDF as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quotation_{quotation_id}.pdf"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
