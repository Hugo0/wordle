# Word data pipeline — multi-stage word processing for Wordle Global

from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.parent
DATA_DIR = SCRIPT_DIR.parent / "data" / "languages"
MIGRATION_DAY_IDX = 1681  # Jan 25, 2026
