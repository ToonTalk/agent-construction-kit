"""Build the claude.ai artifact versions of Agent Kit, English and Swedish.

    python tools/build_artifact.py

Each is the page itself with ARTIFACT_BUILD switched on: its AI agents use only Claude through the claude.ai
sign-in (keyless, inside a claude.ai chat) and Gemini Nano where Chrome offers it. To make the artifact, upload
the file to a claude.ai chat and ask Claude to copy it, exactly as it is, into an HTML artifact.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDS = [("index.html", "en", "agent-kit-claude-artifact.html"), ("sv/index.html", "sv", "agent-kit-claude-artifact-sv.html")]
PAGE_CAP = 950_000      # claude.ai's artifact publish cap is about this (larger pages were refused)
SCRIPT_CAP = 800_000    # one inline script over about 1.2 MB is silently dropped; stay well under

os.makedirs(os.path.join(ROOT, "artifact"), exist_ok=True)
for src, lang, out in BUILDS:
    s = open(os.path.join(ROOT, src), encoding="utf-8").read()
    for old, new in [("const ARTIFACT_BUILD = false;", "const ARTIFACT_BUILD = true;"),
                     ('const PAGE_LANG = document.documentElement.lang || "en";', 'const PAGE_LANG = "%s";   // fixed: an artifact may not keep <html lang>' % lang)]:
        assert s.count(old) == 1, (src, old)
        s = s.replace(old, new)
    size = len(s.encode("utf-8"))
    scripts = [len(m.group(1).encode("utf-8")) for m in re.finditer(r"<script[^>]*>(.*?)</script>", s, re.S)]
    assert size < PAGE_CAP, (out, size)
    assert all(n < SCRIPT_CAP for n in scripts), (out, scripts)
    open(os.path.join(ROOT, "artifact", out), "w", encoding="utf-8", newline="\n").write(s)
    print("%-36s %4d KB  (scripts %s KB)" % (out, size // 1000, ", ".join(str(n // 1000) for n in scripts)))
