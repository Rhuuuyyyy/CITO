from __future__ import annotations

CPF_MASK = "***.***.***-**"


def mask_name(full_name: str) -> str:
    parts = full_name.split()
    if len(parts) > 1:
        return parts[0] + " " + " ".join(p[0] + "***" for p in parts[1:])
    return (full_name[0] + "***") if full_name else "***"
