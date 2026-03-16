from pdfminer.high_level import extract_text
import sys

def get_pdf_text(path):
    try:
        # Extract only the first 10 pages for now to avoid huge output
        text = extract_text(path, maxpages=10)
        print(text[:5000])
    except Exception as e:
        print(f"Error extracting PDF: {e}")

if __name__ == "__main__":
    get_pdf_text("Registration Form Bajabulile Day Care Centre.pdf")
