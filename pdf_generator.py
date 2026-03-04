from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, 
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas
from io import BytesIO
import os
from collections import defaultdict
from models import Quotation


# Brand colors
BRAND_COLOR = colors.HexColor('#8B2E14')
TEXT_DARK = colors.HexColor('#1A1A1A')
TEXT_MUTED = colors.HexColor('#6B6B6B')


def format_currency(amount):
    """Format amount with currency label and commas (avoid glyph issues)."""
    # Using 'Rs.' prefix instead of the rupee symbol to avoid missing-glyph boxes
    return f"Rs. {amount:,.2f}"


def create_header_footer(canvas_obj, doc, quotation_date=None):
    """Create header and footer on every page"""
    canvas_obj.saveState()
    width, height = A4
    
    # Header
    # Left side - Logo (if exists) or Company name
    # To add logo: Place logo.png or logo.jpg in the static/ directory
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    logo_path = None
    for ext in ['.png', '.jpg', '.jpeg']:
        path = os.path.join(static_dir, f'logo{ext}')
        if os.path.exists(path):
            logo_path = path
            break
    
    if logo_path:
        try:
            logo = Image(logo_path, width=1.2*inch, height=0.4*inch)
            logo.drawOn(canvas_obj, 50, height - 50)
        except Exception as e:
            # Fallback to text if logo fails to load
            canvas_obj.setFont("Helvetica-Bold", 12)
            canvas_obj.setFillColor(TEXT_DARK)
            canvas_obj.drawString(50, height - 40, "Studio Strait Arc")
            
            canvas_obj.setFont("Helvetica", 9)
            canvas_obj.setFillColor(TEXT_MUTED)
            canvas_obj.drawString(50, height - 55, "Interior Design & Build")
    else:
        # Text-based header
        canvas_obj.setFont("Helvetica-Bold", 12)
        canvas_obj.setFillColor(TEXT_DARK)
        canvas_obj.drawString(50, height - 40, "Studio Strait Arc")
        
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.setFillColor(TEXT_MUTED)
        canvas_obj.drawString(50, height - 55, "Interior Design & Build")
    
    # Right side - Quotation and Date
    canvas_obj.setFont("Helvetica-Bold", 11)
    canvas_obj.setFillColor(TEXT_DARK)
    canvas_obj.drawRightString(width - 50, height - 40, "Quotation")
    
    if quotation_date:
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.setFillColor(TEXT_MUTED)
        canvas_obj.drawRightString(width - 50, height - 55, f"Date: {quotation_date}")
    
    # Footer
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(TEXT_MUTED)
    # Use drawCentredString (British spelling) or calculate center manually
    page_text = f"Page {canvas_obj.getPageNumber()}"
    text_width = canvas_obj.stringWidth(page_text, "Helvetica", 8)
    canvas_obj.drawString((width - text_width) / 2, 30, page_text)
    
    canvas_obj.restoreState()


def render_category_section(category_name, items, start_sno, column_visibility=None):
    """Render a category section with its items table"""
    if column_visibility is None:
        column_visibility = {
            "showSNo": True,
            "showSubcategory": True,
            "showItem": True,
            "showUOM": True,
            "showRate": True,
            "showQty": True,
            "showAmount": True
        }
    
    elements = []
    
    # Category heading
    category_style = ParagraphStyle(
        'CategoryHeading',
        parent=getSampleStyleSheet()['Heading2'],
        fontSize=14,
        fontName='Helvetica-Bold',
        textColor=TEXT_DARK,
        spaceBefore=24,
        spaceAfter=12,
        leftIndent=0
    )
    category_para = Paragraph(f"<b>{category_name}</b>", category_style)
    elements.append(category_para)
    elements.append(Spacer(1, 0.1*inch))
    
    # Create paragraph style for wrapping text
    cell_style = ParagraphStyle(
        'TableCell',
        parent=getSampleStyleSheet()['Normal'],
        fontSize=9,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        leading=11,
        spaceBefore=0,
        spaceAfter=0
    )
    
    # Table data with Paragraphs for text wrapping
    header_style = ParagraphStyle(
        'TableHeader',
        parent=cell_style,
        fontName='Helvetica-Bold',
        textColor=TEXT_MUTED
    )
    
    # Build header row based on visibility
    header_row = []
    col_widths = []
    column_indices = {}  # Track which column index each field is at
    
    col_idx = 0
    if column_visibility.get("showSNo", True):
        header_row.append(Paragraph('S.No', header_style))
        col_widths.append(0.35*inch)
        column_indices['sno'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showSubcategory", True):
        header_row.append(Paragraph('Subcategory', header_style))
        col_widths.append(1.3*inch)
        column_indices['subcategory'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showItem", True):
        header_row.append(Paragraph('Item', header_style))
        col_widths.append(2.8*inch)
        column_indices['item'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showUOM", True):
        header_row.append(Paragraph('UOM', header_style))
        col_widths.append(0.5*inch)
        column_indices['uom'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showQty", True):
        header_row.append(Paragraph('Qty', header_style))
        col_widths.append(0.6*inch)
        column_indices['qty'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showRate", True):
        header_row.append(Paragraph('Rate', header_style))
        col_widths.append(0.9*inch)
        column_indices['rate'] = col_idx
        col_idx += 1
    
    if column_visibility.get("showAmount", True):
        header_row.append(Paragraph('Amount', header_style))
        col_widths.append(1.0*inch)
        column_indices['amount'] = col_idx
        col_idx += 1
    
    if not header_row:
        # If no columns selected, show a message
        elements.append(Paragraph("No columns selected for display", cell_style))
        return elements, 0, start_sno
    
    table_data = [header_row]
    
    category_total = 0
    current_sno = start_sno
    
    for item in items:
        row = []
        if column_visibility.get("showSNo", True):
            row.append(Paragraph(str(current_sno), cell_style))
        if column_visibility.get("showSubcategory", True):
            row.append(Paragraph(item.subcategory_name, cell_style))
        if column_visibility.get("showItem", True):
            row.append(Paragraph(item.item_name, cell_style))
        if column_visibility.get("showUOM", True):
            row.append(Paragraph(item.uom, cell_style))
        if column_visibility.get("showQty", True):
            row.append(Paragraph(f"{item.quantity:.2f}", cell_style))
        if column_visibility.get("showRate", True):
            row.append(Paragraph(format_currency(item.rate), cell_style))
        if column_visibility.get("showAmount", True):
            row.append(Paragraph(format_currency(item.amount), cell_style))
        
        table_data.append(row)
        category_total += item.amount
        current_sno += 1
    
    # Adjust column widths if some columns are hidden
    total_width = sum(col_widths)
    available_width = 7.27 * inch  # A4 width minus margins
    if total_width < available_width:
        # Distribute extra space proportionally
        scale_factor = available_width / total_width if total_width > 0 else 1
        col_widths = [w * scale_factor for w in col_widths]
    
    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Prevent row splitting across pages
    items_table.hAlign = 'LEFT'
    
    # Determine which columns are numeric (right-aligned: Qty, Rate, Amount)
    # Count non-numeric columns to find where numeric columns start
    numeric_start_col = 0
    if column_visibility.get("showSNo", True):
        numeric_start_col += 1
    if column_visibility.get("showSubcategory", True):
        numeric_start_col += 1
    if column_visibility.get("showItem", True):
        numeric_start_col += 1
    if column_visibility.get("showUOM", True):
        numeric_start_col += 1
    
    # Table style - minimal and clean
    table_style = TableStyle([
        # Header row - left align text columns, right align numeric columns
        ('ALIGN', (0, 0), (numeric_start_col - 1 if numeric_start_col > 0 else -1, 0), 'LEFT'),
        ('ALIGN', (numeric_start_col, 0), (-1, 0), 'RIGHT'),  # Numeric columns right-aligned
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#CCCCCC')),
        
        # Data rows - left align text columns, right align numeric columns
        ('ALIGN', (0, 1), (numeric_start_col - 1 if numeric_start_col > 0 else -1, -1), 'LEFT'),
        ('ALIGN', (numeric_start_col, 1), (-1, -1), 'RIGHT'),  # Numeric columns right-aligned
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 1), (-1, -1), 0.2, colors.HexColor('#F0F0F0')),
    ])
    
    items_table.setStyle(table_style)
    elements.append(items_table)
    
    # Category subtotal
    elements.append(Spacer(1, 0.15*inch))
    
    subtotal_style = ParagraphStyle(
        'Subtotal',
        parent=getSampleStyleSheet()['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=TEXT_DARK,
        alignment=TA_RIGHT,
        spaceAfter=12
    )
    subtotal_para = Paragraph(
        f"<b>Subtotal – {category_name}</b><br/>{format_currency(category_total)}",
        subtotal_style
    )
    elements.append(subtotal_para)
    elements.append(Spacer(1, 0.1*inch))
    
    return elements, category_total, current_sno


def generate_quotation_pdf(quotation: Quotation, column_visibility: dict = None) -> BytesIO:
    buffer = BytesIO()
    
    # Page setup with margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.2*inch,
        bottomMargin=1*inch,
        leftMargin=50,
        rightMargin=50
    )
    
    # Container for elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Client Information Block
    client_style = ParagraphStyle(
        'ClientInfo',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        spaceAfter=20
    )
    
    client_data = [
        [Paragraph(f"<b>Customer Name:</b>", client_style), Paragraph(quotation.customer_name, client_style)],
        [Paragraph(f"<b>Project Name:</b>", client_style), Paragraph(quotation.project_name, client_style)],
        [Paragraph(f"<b>Date:</b>", client_style), Paragraph(quotation.date.strftime('%d-%m-%Y'), client_style)]
    ]
    
    client_table = Table(client_data, colWidths=[2.5*inch, 4*inch])
    client_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(client_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Group items by category
    items_by_category = defaultdict(list)
    for item in quotation.items:
        items_by_category[item.category_name].append(item)
    
    # Calculate grand total
    grand_total = sum(item.amount for item in quotation.items)
    
    elements.append(Spacer(1, 0.2*inch))
    
    # Render each category section
    start_sno = 1
    for category_name in sorted(items_by_category.keys()):
        category_items = items_by_category[category_name]
        category_elements, category_total, next_sno = render_category_section(
            category_name, category_items, start_sno, column_visibility
        )
        
        # Keep category together to avoid page breaks in middle
        elements.append(KeepTogether(category_elements))
        start_sno = next_sno
    
    # Final Grand Total Section (only one, at the end)
    elements.append(Spacer(1, 0.4*inch))
    
    final_total_style = ParagraphStyle(
        'FinalTotal',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=TEXT_DARK,
        alignment=TA_RIGHT,
        spaceBefore=10,
        spaceAfter=5
    )
    
    final_total_amount_style = ParagraphStyle(
        'FinalTotalAmount',
        parent=final_total_style,
        fontSize=16,
        fontName='Helvetica-Bold'
    )
    
    final_total_data = [
        [Paragraph("GRAND TOTAL", final_total_style)],
        [Paragraph(format_currency(grand_total), final_total_amount_style)]
    ]
    
    final_total_table = Table(final_total_data, colWidths=[2.2*inch])
    final_total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (0, 0), (-1, 0), 1, TEXT_DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    final_container = Table([[final_total_table]], colWidths=[A4[0] - 100])
    final_container.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    
    elements.append(final_container)
    
    # Terms & Conditions Page
    elements.append(PageBreak())
    
    terms_heading_style = ParagraphStyle(
        'TermsHeading',
        parent=styles['Heading1'],
        fontSize=16,
        fontName='Helvetica-Bold',
        textColor=TEXT_DARK,
        spaceAfter=24,
        alignment=TA_LEFT
    )
    
    elements.append(Paragraph("Terms & Conditions", terms_heading_style))
    elements.append(Spacer(1, 0.2*inch))
    
    terms_list = [
        "50% advance before execution",
        "Timeline subject to site conditions",
        "Material finish variations possible",
        "Final measurements at site",
        "Quotation valid for 30 days"
    ]
    
    terms_style = ParagraphStyle(
        'TermsItem',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        spaceAfter=12,
        leftIndent=20,
        bulletIndent=10
    )
    
    for term in terms_list:
        elements.append(Paragraph(f"• {term}", terms_style))
    
    # Signature Section
    elements.append(PageBreak())
    elements.append(Spacer(1, 1*inch))
    
    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        spaceAfter=40
    )
    
    signature_data = [
        [
            Paragraph("For Studio Strait Arc", signature_style),
            Paragraph("Client Signature", signature_style)
        ]
    ]
    
    signature_table = Table(signature_data, colWidths=[3.5*inch, 3.5*inch])
    signature_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(signature_table)
    
    # Add space for signatures
    elements.append(Spacer(1, 0.8*inch))
    
    # Signature lines
    line_data = [
        ['_________________________', '_________________________']
    ]
    line_table = Table(line_data, colWidths=[3.5*inch, 3.5*inch])
    line_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_MUTED),
    ]))
    
    elements.append(line_table)
    
    # Build PDF with header/footer
    date_str = quotation.date.strftime('%d-%m-%Y')
    
    def on_first_page(canvas_obj, doc):
        create_header_footer(canvas_obj, doc, date_str)
    
    def on_later_pages(canvas_obj, doc):
        create_header_footer(canvas_obj, doc, date_str)
    
    doc.build(elements, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    
    buffer.seek(0)
    return buffer
