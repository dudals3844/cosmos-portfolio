#!/usr/bin/env python3
"""Build the public Pages artifact from an explicit file allowlist."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    "index.html", ".nojekyll", "app.js", "styles.css", "flower3d.js",
    "research-system.js", "research-system.css", "decision-routing.js", "research-case.js",
    "diversification.js", "diversification.css", "appendix-idea.js", "appendix-idea.css", "inventory-idea.js", "infrastructure-details.css",
    "assets/diversification-demo.js", "assets/favicon.svg",
    "assets/brown_mud_02.jpg", "assets/CREDITS.md",
    "assets/brands/gmail.svg", "assets/brands/googlecalendar.svg",
    "assets/brands/hermes.ico", "assets/brands/obsidian.svg",
    "assets/brands/orca.svg", "assets/brands/paperclip.svg",
    "assets/brands/slack.svg", "assets/brands/twilio.svg",
)


def main():
    destination = ROOT / "_site"
    if destination.is_symlink():
        raise RuntimeError("Public artifact directory must not be a symlink")
    # Validate all inputs before replacing the generated artifact.
    for relative in PUBLIC_FILES:
        source = ROOT / relative
        if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(ROOT):
            raise RuntimeError(f"Invalid public asset: {relative}")
    if destination.exists():
        shutil.rmtree(destination)
    for relative in PUBLIC_FILES:
        output = destination / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / relative, output)
    print(f"Prepared {len(PUBLIC_FILES)} public files")


if __name__ == "__main__":
    main()
