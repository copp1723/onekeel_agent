# CRM Parser Test Report

## Test Summary
- **File:** samples/crm_leads_clean.csv
- **File Type:** csv
- **Parse Successful:** ✅
- **Rows:** 10
- **Columns:** 11
- **Normalization:** ❌
- **Column Mapping:** ❌

## Parse Details
### ✅ Parse Successful

### Sample Data
```json
[
  {
    "Lead ID": 1001,
    "First Name": "John",
    "Last Name": "Smith",
    "Email": "john.smith@example.com",
    "Phone": "555-123-4567",
    "Company": "Acme Corp",
    "Status": "New",
    "Source": "Website",
    "Created Date": "2025-05-01",
    "Last Contacted": "2025-05-10",
    "Notes": "Interested in product demo"
  },
  {
    "Lead ID": 1002,
    "First Name": "Jane",
    "Last Name": "Doe",
    "Email": "jane.doe@example.com",
    "Phone": "555-234-5678",
    "Company": "Globex",
    "Status": "Contacted",
    "Source": "Referral",
    "Created Date": "2025-05-02",
    "Last Contacted": "2025-05-12",
    "Notes": "Requested pricing info"
  },
  {
    "Lead ID": 1003,
    "First Name": "Robert",
    "Last Name": "Johnson",
    "Email": "robertj@example.com",
    "Phone": "555-345-6789",
    "Company": "Initech",
    "Status": "Qualified",
    "Source": "Email",
    "Created Date": "2025-05-03",
    "Last Contacted": "2025-05-15",
    "Notes": "Scheduled call for next week"
  }
]
```

### ❌ Normalization Errors
- DataNormalizer not available

### ❌ Mapping Errors
- ColumnMapper not available