import fitz
import os

def pdf_to_images(pdf_path, output_folder, max_pages=3):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    doc = fitz.open(pdf_path)
    for i in range(min(max_pages, len(doc))):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Higher res
        output_path = os.path.join(output_folder, f"page_{i+1}.png")
        pix.save(output_path)
        print(f"Saved {output_path}")
    doc.close()

if __name__ == "__main__":
    pdf_to_images("Registration Form Bajabulile Day Care Centre.pdf", "tmp_reg_extract")
