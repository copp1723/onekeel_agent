import os
import pytest
import pandas as pd
from data_parser import parse_csv

REAL_DATA_DIR = os.path.join(os.path.dirname(__file__), '../../real data files')

# List of real CSV files to test
REAL_CSV_FILES = [
    "Acura Columbus - Dashboard Data - ROI.csv",
    "Allen of Monroe - Sales Targets  - 2024 Combined Retail Sales Target.csv",
    "Copy of April 2024 - ROI Calc - GA4 Campaign.csv",
    "Copy of April 2024 - ROI Calc - GA4 Source.csv",
    "Copy of April 2024 - ROI Calc - Sheet4 (4).csv",
    "Copy of April 2024 - ROI Calc - Sold Log.csv",
    "LeadSourceROI_2025-05-16.csv",
    "Leaderboard_2025-05-16.csv",
    "Table_1758.csv",
    "_Inventory   - Sheet1.csv",
    "watchdog data easy.csv",
    "watchdog data hard.csv",
    "watchdog data medium.csv",
]

@pytest.mark.parametrize("filename", REAL_CSV_FILES)
def test_parse_real_csv_files(filename):
    file_path = os.path.join(REAL_DATA_DIR, filename)
    df = parse_csv(file_path)
    # Check that the DataFrame is not empty
    assert not df.empty, f"Parsed DataFrame from {filename} is empty!"
    # Optionally, check for at least 2 columns (real data should have columns)
    assert len(df.columns) >= 2, f"Parsed DataFrame from {filename} has too few columns!"
    # Optionally, check for no completely null columns
    assert not all(df[col].isnull().all() for col in df.columns), f"All columns in {filename} are null!"
