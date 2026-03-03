from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SubcategoryCreate(BaseModel):
    name: str
    category_id: int


class SubcategoryResponse(BaseModel):
    id: int
    name: str
    category_id: int

    class Config:
        from_attributes = True


class ItemCreate(BaseModel):
    name: str
    subcategory_id: int
    uom: str
    rate: float


class ItemResponse(BaseModel):
    id: int
    name: str
    subcategory_id: int
    uom: str
    rate: float

    class Config:
        from_attributes = True


class QuotationItemCreate(BaseModel):
    category_name: str
    subcategory_name: str
    item_name: str
    uom: str
    quantity: float
    rate: float
    amount: float


class QuotationCreate(BaseModel):
    customer_name: str
    project_name: str
    date: date
    items: List[QuotationItemCreate]


class QuotationItemResponse(BaseModel):
    id: int
    category_name: str
    subcategory_name: str
    item_name: str
    uom: str
    quantity: float
    rate: float
    amount: float

    class Config:
        from_attributes = True


class QuotationResponse(BaseModel):
    id: int
    customer_name: str
    project_name: str
    date: date
    items: List[QuotationItemResponse]

    class Config:
        from_attributes = True


class QuotationUpdate(BaseModel):
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    date: Optional[date] = None
    items: Optional[List[QuotationItemCreate]] = None


class QuotationListItem(BaseModel):
    id: int
    customer_name: str
    project_name: str
    date: date
    created_at: Optional[datetime] = None
    total_amount: float

    class Config:
        from_attributes = True
