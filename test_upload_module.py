import os
from pathlib import Path
import sys
import traceback
import shutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to sys.path to allow absolute import
sys.path.append(str(Path(__file__).parent))
from legacy_code.upload import parse_uploaded_file, validate_dataframe

TEST_DATA_DIR = Path(__file__).parent / "real data files"

def ensure_data_dictionary():
    """Ensure the data dictionary exists in both locations for testing."""
    source_path = Path(__file__).parent / "legacy_code" / "data_dictionary.json"
    assets_path = Path(__file__).parent / "assets" / "data_dictionary.json"

    if not source_path.exists():
        logger.error(f"Source data dictionary not found at {source_path}")
        return False

    # Ensure assets directory exists
    assets_dir = assets_path.parent
    assets_dir.mkdir(exist_ok=True, parents=True)

    # Copy to assets if needed
    if not assets_path.exists():
        try:
            shutil.copy(source_path, assets_path)
            logger.info(f"Copied data dictionary to {assets_path}")
        except Exception as e:
            logger.error(f"Failed to copy data dictionary: {e}")
            return False

    return True

class DummyFile:
    """A dummy file object to mimic Streamlit's UploadedFile for test purposes."""
    def __init__(self, path):
        self.name = os.path.basename(path)
        self._path = path
        self.size = os.path.getsize(path)
    def getbuffer(self):
        with open(self._path, "rb") as f:
            return f.read()


def test_file(file_path):
    print(f"\n=== Testing: {os.path.basename(file_path)} ===")
    dummy_file = DummyFile(file_path)
    # Write to temp file for parse_uploaded_file
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(dummy_file.name)[1]) as temp_file:
        temp_file.write(dummy_file.getbuffer())
        temp_path = temp_file.name
    try:
        df, proc_results, parse_err = parse_uploaded_file(dummy_file, temp_path)
        if parse_err:
            print(f"[PARSE ERROR] {parse_err}")
            return False
        print(f"[PARSE SUCCESS] Rows: {len(df)}, Columns: {list(df.columns)}")
        val_results, val_err = validate_dataframe(df)
        if val_err:
            print(f"[VALIDATION ERROR] {val_err}")
            return False
        print(f"[VALIDATION SUCCESS] {val_results}")
        return True
    except Exception as e:
        print(f"[EXCEPTION] {e}")
        traceback.print_exc()
        return False
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

def test_data_dictionary_handling():
    """Test the data dictionary handling with different scenarios."""
    print("\n=== Testing Data Dictionary Handling ===")

    # First ensure we have a data dictionary in the legacy_code directory
    source_path = Path(__file__).parent / "legacy_code" / "data_dictionary.json"
    assets_path = Path(__file__).parent / "assets" / "data_dictionary.json"

    # Backup the assets data dictionary if it exists
    assets_backup = None
    if assets_path.exists():
        assets_backup = assets_path.with_suffix('.json.bak')
        try:
            shutil.copy(assets_path, assets_backup)
            logger.info(f"Backed up assets data dictionary to {assets_backup}")
        except Exception as e:
            logger.error(f"Failed to backup assets data dictionary: {e}")

    # Test with only legacy_code data dictionary
    if assets_path.exists():
        try:
            os.remove(assets_path)
            logger.info(f"Removed assets data dictionary for testing")
        except Exception as e:
            logger.error(f"Failed to remove assets data dictionary: {e}")

    # Find a CSV file for testing
    csv_files = list(TEST_DATA_DIR.glob("*.csv"))
    if not csv_files:
        print("No CSV files found for testing")
        return False

    test_file_path = str(csv_files[0])
    print(f"Testing with file: {os.path.basename(test_file_path)}")

    # Test with only legacy_code data dictionary
    result1 = test_file(test_file_path)
    print(f"Test with only legacy_code data dictionary: {'PASS' if result1 else 'FAIL'}")

    # Restore the assets data dictionary
    ensure_data_dictionary()

    # Test with both data dictionaries
    result2 = test_file(test_file_path)
    print(f"Test with both data dictionaries: {'PASS' if result2 else 'FAIL'}")

    # Restore original assets data dictionary if it existed
    if assets_backup and assets_backup.exists():
        try:
            shutil.copy(assets_backup, assets_path)
            os.remove(assets_backup)
            logger.info(f"Restored original assets data dictionary")
        except Exception as e:
            logger.error(f"Failed to restore original assets data dictionary: {e}")

    return result1 or result2

def main():
    # First ensure the data dictionary is available
    if not ensure_data_dictionary():
        print("WARNING: Could not ensure data dictionary is available. Tests may fail.")

    # Test data dictionary handling
    dict_test_result = test_data_dictionary_handling()

    # Test regular file parsing
    files = list(TEST_DATA_DIR.glob("*.csv")) + list(TEST_DATA_DIR.glob("*.pdf"))
    results = {}
    for file_path in files:
        result = test_file(str(file_path))
        results[str(file_path)] = result

    print("\n=== Test Summary ===")
    print(f"Data Dictionary Handling: {'PASS' if dict_test_result else 'FAIL'}")
    for f, r in results.items():
        print(f"{os.path.basename(f)}: {'PASS' if r else 'FAIL'}")

    # Overall result
    all_passed = dict_test_result and all(results.values())
    print(f"\nOverall Test Result: {'PASS' if all_passed else 'FAIL'}")
    return all_passed

if __name__ == "__main__":
    success = main()
    # Exit with appropriate code for CI/CD pipelines
    sys.exit(0 if success else 1)
