
#!/usr/bin/env python
"""
Character JSON Field Analysis Report

This script:
1. Reads all character records from the database
2. Analyzes the structure of JSONB fields (character_traits, plot_lines)
3. Generates a report of any issues found
4. Does NOT modify any data
"""

import sys
import os
import json
import logging
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.base import db
from models.character_data import Character
from utils.json_utils import safe_json_loads

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler(f"character_json_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger(__name__)

# Create a small Flask app to work with the database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'  # Update with your actual DB URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def analyze_field_structure(field_data, field_name):
    """Analyze the structure of a field and report any issues."""
    issues = []
    
    # Check for None
    if field_data is None:
        return [f"{field_name} is None"]
    
    # Check valid JSON structure
    if isinstance(field_data, str):
        success, error, _ = safe_json_loads(field_data)
        if not success:
            issues.append(f"{field_name} contains invalid JSON: {error}")
    
    # Check expected type
    if field_name == 'character_traits':
        if not isinstance(field_data, (list, dict, str)):
            issues.append(f"{field_name} has unexpected type: {type(field_data)}")
    elif field_name == 'plot_lines':
        if not isinstance(field_data, (list, str)):
            issues.append(f"{field_name} has unexpected type: {type(field_data)}")
    
    return issues

def analyze_character(character):
    """Analyze a character for issues in JSONB fields."""
    issues = []
    
    # Analyze character_traits
    trait_issues = analyze_field_structure(character.character_traits, 'character_traits')
    issues.extend(trait_issues)
    
    # Analyze plot_lines
    plot_issues = analyze_field_structure(character.plot_lines, 'plot_lines')
    issues.extend(plot_issues)
    
    # Check backstory for potential JSON
    if character.backstory and (character.backstory.startswith('{') or character.backstory.startswith('[')):
        success, _, _ = safe_json_loads(character.backstory)
        if success:
            issues.append("backstory appears to contain JSON but is stored as text field")
    
    return issues

def generate_report():
    """Generate a report of all character JSON field issues."""
    with app.app_context():
        characters = Character.query.all()
        logger.info(f"Found {len(characters)} characters in the database")
        
        issue_count = 0
        characters_with_issues = 0
        
        # Prepare report file
        report_file = f"character_json_issues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write("CHARACTER JSON FIELD ANALYSIS REPORT\n")
            f.write("====================================\n\n")
            f.write(f"Total characters analyzed: {len(characters)}\n\n")
            
            for character in characters:
                issues = analyze_character(character)
                
                if issues:
                    characters_with_issues += 1
                    issue_count += len(issues)
                    
                    f.write(f"\nCHARACTER ID: {character.id}\n")
                    f.write(f"NAME: {character.character_name}\n")
                    f.write(f"ROLE: {character.character_role}\n")
                    f.write("ISSUES:\n")
                    for issue in issues:
                        f.write(f"  - {issue}\n")
                    
                    # Print raw data for debugging
                    f.write("RAW DATA:\n")
                    f.write(f"  character_traits: {repr(character.character_traits)}\n")
                    f.write(f"  plot_lines: {repr(character.plot_lines)}\n")
                    f.write("\n" + "-"*50 + "\n")
            
            # Write summary
            f.write("\nSUMMARY\n")
            f.write("=======\n")
            f.write(f"Total characters with issues: {characters_with_issues}\n")
            f.write(f"Total issues found: {issue_count}\n")
        
        logger.info(f"Report generated: {report_file}")
        logger.info(f"Characters with issues: {characters_with_issues}")
        logger.info(f"Total issues found: {issue_count}")

def main():
    """Main function to run the script."""
    logger.info("Starting character JSON field analysis...")
    generate_report()
    logger.info("Character JSON field analysis complete.")

if __name__ == "__main__":
    main()
