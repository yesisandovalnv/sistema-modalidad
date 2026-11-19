"""Lee el MSI del extractor como archivo y expande su CAB; no ejecuta instalación."""
from pathlib import Path
import ctypes as c,subprocess,hashlib,json
P=Path(__file__).resolve().parent/'herramientas'
msi=c.WinDLL('msi');U=c.c_uint;D=c.c_ulong;W=c.c_wchar_p
msi.MsiOpenDatabaseW.argtypes=[W,c.c_void_p,c.POINTER(U)]
msi.MsiDatabaseOpenViewW.argtypes=[U,W,c.POINTER(U)]
msi.MsiViewExecute.argtypes=[U,U];msi.MsiViewFetch.argtypes=[U,c.POINTER(U)]
msi.MsiRecordGetStringW.argtypes=[U,U,W,c.POINTER(D)]
msi.MsiRecordReadStream.argtypes=[U,U,c.c_void_p,c.POINTER(D)]
def check(n):
    if n:raise OSError('Windows Installer API '+str(n))
db=U();check(msi.MsiOpenDatabaseW(str(P/'7z2605-x64.msi'),None,c.byref(db)))
def query(q):
    v=U();check(msi.MsiDatabaseOpenViewW(db,q,c.byref(v)));check(msi.MsiViewExecute(v,0));out=[]
    while True:
        row=U();r=msi.MsiViewFetch(v,c.byref(row))
        if r==259:break
        check(r);out.append(row)
    msi.MsiCloseHandle(v);return out
def string(row,n):
    b=c.create_unicode_buffer(1024);size=D(1023);check(msi.MsiRecordGetStringW(row,n,b,c.byref(size)));return b.value
names=[]
for row in query('SELECT `Name` FROM `_Streams`'):
    names.append(string(row,1));msi.MsiCloseHandle(row)
print('Streams',names,flush=True)
for name in names:
    if not name.lower().endswith('.cab'):continue
    for row in query("SELECT `Data` FROM `_Streams` WHERE `Name`='"+name+"'"):
        cab=P/Path(name).name
        with cab.open('wb') as f:
            while True:
                size=D(65536);b=c.create_string_buffer(65536);check(msi.MsiRecordReadStream(row,1,b,c.byref(size)))
                if not size.value:break
                f.write(b.raw[:size.value])
        msi.MsiCloseHandle(row)
        target=P/'extractor';target.mkdir(exist_ok=True)
        subprocess.run(['C:/Windows/System32/expand.exe','-F:*',str(cab),str(target)],check=True,capture_output=True)
for row in query('SELECT `File`,`FileName` FROM `File`'):
    key,name=string(row,1),string(row,2).split('|')[-1]
    source=P/'extractor'/key;target=P/'extractor'/name
    if source.exists() and source!=target:source.rename(target)
    msi.MsiCloseHandle(row)
msi.MsiCloseHandle(db)
record={'url':'https://github.com/ip7z/7zip/releases/download/26.05/7z2605-x64.msi','official_reference':'https://www.7-zip.org/download.html','sha256':hashlib.sha256((P/'7z2605-x64.msi').read_bytes()).hexdigest(),'method':'MSI abierto en modo lectura mediante msi.dll; CAB expandido localmente sin instalación global'}
(P/'procedencia-extractor.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extractor preparado',flush=True)
