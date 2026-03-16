import fitz
import sys

def get_pdf_text(path):
    try:
        doc = fitz.open(path)
        print(f"File: {path}, Pages: {len(doc)}")
        for i in range(min(5, len(doc))):
            page = doc.load_page(i)
            text = page.get_text()
            print(f"--- Page {i+1} ---")
            print(text[:2000])
        doc.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_pdf_text("Monthly Report Bajabulile Day Care Centre.pdf")
    print("\n" + "="*50 + "\n")
    get_pdf_text("Registration Form Bajabulile Day Care Centre.pdf")
