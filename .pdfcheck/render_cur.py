import os, shutil, traceback, glob
import win32com.client as win32
# localizar os 4 docx 01-04
docs=[]
for root,_,files in os.walk("docs"):
    for f in files:
        if f.endswith(".docx") and ("01 -" in root or "02 -" in root or "03 -" in root or "04 -" in root):
            docs.append(os.path.abspath(os.path.join(root,f)))
docs.sort()
TMP=r"C:\Temp\cur_check"; os.makedirs(TMP,exist_ok=True)
word=win32.DispatchEx("Word.Application"); word.Visible=False; word.DisplayAlerts=0
status=[]
try:
    word.AutomationSecurity=3
    for k,src in enumerate(docs):
        ad=os.path.join(TMP,f"d{k}.docx"); ap=os.path.join(TMP,f"d{k}.pdf")
        shutil.copyfile(src,ad)
        doc=word.Documents.Open(ad,ReadOnly=True,ConfirmConversions=False,AddToRecentFiles=False)
        doc.ExportAsFixedFormat(OutputFileName=ap,ExportFormat=17,OpenAfterExport=False)
        doc.Close(False)
        status.append(f"{k}|{os.path.basename(src)}|{ap}")
except Exception:
    status.append("ERRO\n"+traceback.format_exc())
finally:
    try: word.Quit()
    except Exception: pass
open(os.path.abspath(".pdfcheck/cur_done.txt"),"w",encoding="utf-8").write("\n".join(status))
