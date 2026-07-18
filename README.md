Condo Association Financial Management System
1.Overview

The Condo Association Financial Management System is designed to help manage the day-to-day financial operations of a condo association. It provides a centralized platform to track vendors, invoices, HOA deposits, bank statements, reconciliation, and financial reports.

The system aims to reduce manual work by automating document processing, organizing financial records, and providing better visibility into the association's financial status.

Features

- Vendor Management
- Invoice Management
- Gmail Invoice Extraction
- Bank Statement Processing
- Bank Reconciliation
- HOA Deposit Tracking
- Special Assessment Tracking
- Dashboard & Reports
- User Authentication & Authorization
- OCR/Document Extraction

Technology Stack

- Python
- FastAPI
- MySQL
- Document AI 
- Checklist AI

project structure:

The backend folder structure as follows

Backend/
│
├── app/
│   ├── api/
│   │   └── router.py             
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── logger.py
│   │   ├── exceptions.py
│   │   ├── error_codes.py
│   │   └── utils.py
│   │
│   ├── modules/
│   │   ├── health/
│   │   ├── vendor/
│   │   └── extraction/
│   │
│   ├── prompts/
│   ├── yaml/
│   ├── main.py
│   └── __init__.py

---
Requirements:

Clone the repository:

bash
git clone <repository-url>

Install dependencies:

bash
pip install -r requirements.txt

Configure environment

Create a `.env` file and configure the required environment variables.

Example:
env
DATABASE_URL=
SECRET_KEY=

Run the application

bash
uvicorn app.main:app --reload

Future Enhancements:

- Email Notifications
- Payment Integration
- Advanced Analytics
- Audit Dashboard
- Mobile Support


