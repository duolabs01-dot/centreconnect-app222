import os
import subprocess
from pathlib import Path
import re

ROOT = Path("C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app")
MANIFEST_FILE = Path(os.environ.get("TEMP", "C:/tmp")) / "manifest.txt"


def print_header(title: str) -> None:
    print(f"=== {title} ===")


def safe_text(path: Path) -> str:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return path.read_text(encoding=encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def list_files() -> list[Path]:
    exts = {".tsx", ".ts", ".css", ".sql"}
    files = [
        p
        for p in ROOT.rglob("*")
        if p.is_file()
        and p.suffix in exts
        and all(token not in str(p) for token in ("\\node_modules\\", "\\.next\\", "\\.git\\"))
    ]
    files.sort()
    return files


def command_0_1() -> None:
    files = list_files()
    MANIFEST_FILE.write_text("\n".join(str(f) for f in files))
    print(len(files))
    for f in files:
        print(str(f))


def command_0_2() -> None:
    layout_candidates = sorted(ROOT.joinpath("app").rglob("layout.tsx"))
    for layout in layout_candidates:
        print_header(str(layout))
        print(safe_text(layout))


def command_0_3() -> None:
    css_files = []
    for base in (ROOT / "app", ROOT / "components"):
        css_files.extend(sorted(base.rglob("*.css")))
    for css in css_files:
        print_header(str(css))
        print(safe_text(css))


def search(pattern: re.Pattern, base_dirs: list[Path]) -> list[tuple[Path, int, str]]:
    matches = []
    for base in base_dirs:
        if not base.exists():
            continue
        for file in sorted(base.rglob("*.tsx")):
            if "\\node_modules\\" in str(file):
                continue
            lines = safe_text(file).splitlines()
            for i, line in enumerate(lines, start=1):
                if pattern.search(line):
                    matches.append((file, i, line.strip()))
    return matches


def command_0_4() -> None:
    pattern = re.compile(r"TabsList|TabsTrigger|<Tabs\b")
    targets = [ROOT / "app" / "(ecd)", ROOT / "components"]
    print_header("ECD TABS SCAN")
    matches = search(pattern, targets)
    for path, line, text in matches:
        print(f"{path}:{line}: {text}")


def command_0_5() -> None:
    pattern = re.compile(r"bg-white\b|bg-gray-50\b|bg-background\b|bg-card\b")
    targets = [ROOT / "app" / "(ecd)"]
    print_header("ECD LIGHT THEME REGRESSION")
    matches = search(pattern, targets)
    for path, line, text in matches:
        print(f"{path}:{line}: {text}")


def command_0_6() -> None:
    sidebar_files = []
    for p in sorted(ROOT.joinpath("app").rglob("*Sidebar*.tsx")):
        if "(ecd)" in str(p):
            sidebar_files.append(p)
    for p in sorted(ROOT.joinpath("components").rglob("*Sidebar*.tsx")):
        if "(ecd)" in str(p):
            sidebar_files.append(p)
    sidebar_files = sidebar_files[:5]
    for pf in sidebar_files:
        print_header(str(pf))
        print(safe_text(pf))


def command_0_7() -> None:
    pattern = re.compile(r"ecd-admin|glass-card|slate-900|cyan-600|backdrop-blur")
    targets = [ROOT / "app" / "(admin)"]
    print_header("ADMIN LEAKAGE SCAN")
    matches = search(pattern, targets)
    for path, line, text in matches:
        print(f"{path}:{line}: {text}")


def command_0_8() -> None:
    sql_dir = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
    pattern = re.compile(r"POLICY.*applications|ON applications", re.IGNORECASE)
    print_header("RLS APPLICATIONS POLICIES")
    for file in sql_dir:
        lines = safe_text(file).splitlines()
        for idx, line in enumerate(lines, start=1):
            if pattern.search(line):
                snippet = "\n".join(lines[max(0, idx - 2): idx + 1])
                print(f"{file}:{idx}: {line}")


def command_0_9() -> None:
    sql_dir = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
    pattern = re.compile(r"CREATE.*FUNCTION|REPLACE.*FUNCTION", re.IGNORECASE)
    print_header("RLS HELPER FUNCTIONS")
    for file in sql_dir:
        text = safe_text(file)
        for match in pattern.finditer(text):
            start = text.rfind("\n", 0, match.start()) + 1
            end = text.find("\n", match.end())
            snippet = text[start:end].strip()
            if any(needle in snippet for needle in ("auth_role", "auth_ecd_id", "is_ecd_member", "is_platform_admin")):
                print(f"{file}:{snippet}")


def command_0_10() -> None:
    matches = []
    for folder in (ROOT / "app" / "c", ROOT / "app" / "centre"):
        if not folder.exists():
            continue
        for file in sorted(folder.rglob("page.tsx")):
            matches.append(file)
    print_header("PUBLIC CENTRE PAGE")
    for file in matches:
        print(str(file))
    apply_matches = []
    for file in matches:
        lines = safe_text(file).splitlines()
        for idx, line in enumerate(lines, start=1):
            if "Apply" in line or "apply" in line:
                apply_matches.append((file, idx, line.strip()))
    for path, line, text in apply_matches:
        print(f"{path}:{line}: {text}")


def command_0_11() -> None:
    targets = []
    for folder in (ROOT / "app" / "c", ROOT / "app" / "centre"):
        if folder.exists():
            targets.append(folder)
    print_header("PUBLIC PAGE TABS")
    pattern = re.compile(r"TabsList|TabsTrigger|<Tabs\b")
    matches = search(pattern, targets)
    for path, line, text in matches:
        print(f"{path}:{line}: {text}")


def command_0_12() -> None:
    print_header("FORMS MISSING ESCAPE")
    files = sorted(ROOT.rglob("*.tsx"))
    matches = []
    for file in files:
        if "node_modules" in str(file):
            continue
        content = safe_text(file)
        if "handleSubmit" in content or "onSubmit" in content:
            if not re.search(r"onClose|onCancel|Cancel|aria-label.*[Cc]lose|<X\b|×", content):
                matches.append(str(file))
    for f in matches:
        print(f)


def command_0_13() -> None:
    print_header("GUARDIAN STATE")
    files = []
    for root_dir in (ROOT / "supabase" / "migrations", ROOT / "app", ROOT / "components"):
        for path in root_dir.rglob("*"):
            if path.is_file():
                content = safe_text(path)
                if "guardian" in content or "co.guardian" in content:
                    files.append(str(path))
    for f in sorted(set(files)):
        print(f)


def command_0_14() -> None:
    print_header("TRANSPORT STATE")
    files = []
    for root_dir in (ROOT / "supabase" / "migrations", ROOT / "app", ROOT / "components"):
        for path in root_dir.rglob("*"):
            if path.is_file():
                content = safe_text(path)
                if "transport" in content:
                    files.append(str(path))
    for f in sorted(set(files)):
        print(f)


def command_0_15() -> None:
    print_header("PARENT DASHBOARD")
    dashboard = ROOT / "app" / "(parent)" / "dashboard" / "page.tsx"
    if dashboard.exists():
        print(safe_text(dashboard))
    else:
        alt = ROOT / "app" / "parent" / "dashboard" / "page.tsx"
        if alt.exists():
            print(safe_text(alt))
        else:
            print("Parent dashboard page not found.")


def command_0_16() -> None:
    print_header("TS BASELINE")
    tsc = subprocess.run(["npx", "tsc", "--noEmit"], capture_output=True, text=True)
    print(tsc.stdout)
    print(f"error TS count: {tsc.stdout.count('error TS')}")

    print_header("LINT BASELINE")
    lint = subprocess.run(["npx", "next", "lint"], capture_output=True, text=True)
    print(lint.stdout)
    print(f"Lint errors: {lint.stdout.count('Error')}")

    print_header("BUILD BASELINE")
    build = subprocess.run(["npx", "next", "build"], capture_output=True, text=True)
    build_lines = build.stdout.strip().splitlines()
    tail_lines = build_lines[-15:] if len(build_lines) >= 15 else build_lines
    for line in tail_lines:
        print(line)


def main() -> None:
    command_0_1()
    command_0_2()
    command_0_3()
    command_0_4()
    command_0_5()
    command_0_6()
    command_0_7()
    command_0_8()
    command_0_9()
    command_0_10()
    command_0_11()
    command_0_12()
    command_0_13()
    command_0_14()
    command_0_15()
    command_0_16()


if __name__ == "__main__":
    main()
