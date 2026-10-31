"""
Structured syllabus parser for StudyForge.

Extracts:
1. Course / Subject Name (from first header lines)
2. Topics with structured subtopics list, word counts, and topic types (theory / numerical / lab-heavy)
3. Clarity and confidence warnings for handwriting and noisy OCR
"""
import re
from typing import List, Dict, Any, Optional


def extract_course_name(lines: List[str]) -> str:
    """Identify course name or subject title from the top header lines."""
    for line in lines[:8]:
        s = line.strip()
        if not s or len(s) < 3:
            continue
        # Strip common label prefixes
        clean = re.sub(r"^(course(\s+name)?|subject|syllabus(\s+for)?|curriculum(\s+for)?)\s*[:\-]\s*", "", s, flags=re.IGNORECASE).strip()
        if not clean:
            continue
        # If looks like a course code e.g. "CS 101: Data Structures", "PHYS 202 - Quantum Mechanics"
        if re.search(r"\b[A-Z]{2,4}\s*\d{3,4}\b", clean):
            return clean[:80]
        # Or starts with "Syllabus"
        if re.match(r"^syllabus\s*[:\-]?\s*", s, re.IGNORECASE):
            sub = re.sub(r"^syllabus\s*[:\-]?\s*", "", s, flags=re.IGNORECASE).strip()
            if sub and len(sub) > 2:
                return sub[:80]
        # Or a prominent title without numbers at start
        if not re.match(r"^\d+[\.\)]", clean) and len(clean.split()) <= 8:
            return clean[:80]

    return "Course Syllabus"


def _parse_table_syllabus(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Detect and parse table-style syllabi where rows look like:
        Module | Topic | Sub-topics
        Unit 1 | Trees | Binary trees, AVL, B-trees
    Returns a list of topic dicts, or empty list if no table structure detected.
    """
    table_topics: List[Dict[str, Any]] = []
    pipe_lines = [l for l in lines if "|" in l]
    if len(pipe_lines) < 2:
        return []

    for line in pipe_lines:
        cells = [c.strip() for c in line.split("|") if c.strip()]
        if len(cells) < 2:
            continue
        # Skip header rows
        lower_cells = [c.lower() for c in cells]
        if any(h in lower_cells for h in ["module", "topic", "sub-topic", "subtopic", "unit", "week", "description", "s/no", "s.n", "#"]):
            continue

        # Pattern: Module/Unit label | Topic title | Sub-topics
        title = cells[1] if len(cells) >= 2 else cells[0]
        subtopics_raw = cells[2] if len(cells) >= 3 else ""
        subtopics = [s.strip() for s in re.split(r"[,;&]", subtopics_raw) if len(s.strip()) > 2] if subtopics_raw else []

        if len(title) < 3:
            continue

        table_topics.append({
            "title": title[:80],
            "subtopics": subtopics[:8],
            "explicit_count": len(subtopics) if subtopics else None,
            "raw_lines": [line],
        })

    return table_topics


def parse_syllabus(raw_text: str, extraction_method: str = "text") -> Dict[str, Any]:
    """
    Parses full raw syllabus text into course title, structured topics, and warnings.
    Handles both heading/bullet-style and table-style (Module | Topic | Sub-topics) syllabi.
    Returns:
    {
        "course_name": str,
        "topics": [{
            "title": str,
            "subtopics": [str],
            "subtopic_count": int,
            "word_count": int,
            "kind": 'theory' | 'numerical' | 'lab-heavy'
        }],
        "warning": Optional[str]
    }
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not lines:
        return {
            "course_name": "Course Syllabus",
            "topics": [],
            "warning": "Text was hard to read — please check the topics"
        }

    course_name = extract_course_name(lines)

    # Heuristic for low-quality / handwriting warning:
    # If image-ocr / pdf-ocr and has high proportion of non-dictionary or short garbled tokens
    warning: Optional[str] = None
    if "ocr" in extraction_method:
        total_words = [w for w in re.findall(r"\b\w+\b", raw_text)]
        long_words = [w for w in total_words if len(w) >= 3]
        if len(total_words) < 15 or (len(long_words) / max(1, len(total_words)) < 0.6):
            warning = "Text was hard to read — please check the topics"

    # Try table-style parsing first (Module | Topic | Sub-topics)
    table_topics = _parse_table_syllabus(lines)
    if table_topics:
        formatted_topics: List[Dict[str, Any]] = []
        for t in table_topics:
            title = t["title"].strip()
            if not title:
                continue
            lower = title.lower()
            if any(kw in lower for kw in ["lab", "docker", "pipeline", "implementation", "git", "fastapi", "react", "programming", "pytorch", "code"]):
                kind = "lab-heavy"
            elif any(kw in lower for kw in ["algorithm", "complexity", "dijkstra", "calculus", "matrix", "tree", "graph", "sort", "search", "math", "numerical", "rsa", "sql"]):
                kind = "numerical"
            else:
                kind = "theory"
            subs = t.get("subtopics", [])
            sub_count = len(subs) if subs else max(3, min(7, len(title.split())))
            raw_words = sum(len(l.split()) for l in t.get("raw_lines", []))
            word_count = max(25, min(120, raw_words + sub_count * 8))
            formatted_topics.append({
                "title": title,
                "subtopics": subs[:8],
                "subtopic_count": max(1, sub_count),
                "word_count": word_count,
                "kind": kind,
            })
        return {
            "course_name": course_name,
            "topics": formatted_topics[:25],
            "warning": warning,
        }

    topics: List[Dict[str, Any]] = []
    current_topic: Optional[Dict[str, Any]] = None

    for line in lines:
        # Check if line is the course header itself
        if line.lower() == course_name.lower():
            continue

        # Check for topic header patterns (e.g. "1. Trees", "Module 2: Queues", "Unit 3 - Recursion", "Topic: Hashing")
        is_topic_header = False
        topic_title = ""
        topic_match = re.match(
            r"^(?:(?:unit|module|chapter|topic|week|session)\s*\d+[\s:\.\-]+|\d+[\.\)]\s+)(.*)$",
            line,
            re.IGNORECASE
        )

        if topic_match:
            is_topic_header = True
            topic_title = topic_match.group(1).strip()
        elif re.match(r"^[A-Z0-9\s,\-\(\)]{4,60}:$", line):
            is_topic_header = True
            topic_title = line.rstrip(":")
        elif not current_topic and len(line.split()) <= 8 and not re.match(r"^[\*\-\•]", line):
            # First clean line following course header
            if line.lower() not in ["syllabus", "lecture notes", "course outline"]:
                is_topic_header = True
                topic_title = line

        if is_topic_header:
            if current_topic:
                topics.append(current_topic)

            clean_title = re.sub(r"[\:\-\–]+$", "", topic_title).strip()
            # Check for explicit subtopics mention e.g. " - 5 subtopics"
            sub_mention = re.search(r"(\d+)\s*(subtopics|topics|sub-topics|concepts)", clean_title, re.IGNORECASE)
            explicit_count = int(sub_mention.group(1)) if sub_mention else None
            clean_title = re.sub(r"(\-|\:|\()\s*\d+\s*(subtopics|topics|sub-topics|concepts)\s*\)?", "", clean_title, flags=re.IGNORECASE).strip()

            current_topic = {
                "title": clean_title[:80],
                "subtopics": [],
                "explicit_count": explicit_count,
                "raw_lines": [line],
            }
        else:
            # Bullet point or sub-line under current topic
            clean_sub = re.sub(r"^(\d+[\.\)]|\-|\*|\•)\s*", "", line).strip()
            if current_topic and clean_sub:
                current_topic["raw_lines"].append(line)
                # Split comma separated subtopics
                parts = [p.strip() for p in re.split(r"[,;&]", clean_sub) if len(p.strip()) > 2]
                if parts:
                    current_topic["subtopics"].extend(parts[:5])
                else:
                    current_topic["subtopics"].append(clean_sub[:60])

    if current_topic:
        topics.append(current_topic)

    # Fallback: if no structured topics detected, treat non-empty bullet points or distinct lines as topics
    if not topics:
        for line in lines:
            if re.match(r"^(syllabus|overview|curriculum|course outline)", line, re.IGNORECASE):
                continue
            clean = re.sub(r"^(\d+[\.\)]|\-|\*|\•)\s*", "", line).strip()
            if len(clean) >= 4 and len(clean.split()) <= 12:
                topics.append({
                    "title": clean[:80],
                    "subtopics": [],
                    "explicit_count": None,
                    "raw_lines": [line],
                })

    formatted_topics: List[Dict[str, Any]] = []
    for t in topics:
        title = t["title"].strip()
        if not title:
            continue

        lower = title.lower()
        if any(kw in lower for kw in ["lab", "docker", "pipeline", "implementation", "git", "fastapi", "react", "programming", "pytorch", "code"]):
            kind = "lab-heavy"
        elif any(kw in lower for kw in ["algorithm", "complexity", "dijkstra", "calculus", "matrix", "tree", "graph", "sort", "search", "math", "numerical", "rsa", "sql"]):
            kind = "numerical"
        else:
            kind = "theory"

        subs = t.get("subtopics", [])
        if t.get("explicit_count"):
            sub_count = t["explicit_count"]
        elif subs:
            sub_count = len(subs)
        else:
            sub_count = max(3, min(7, len(title.split())))

        # Description word count estimation
        raw_words = sum(len(l.split()) for l in t.get("raw_lines", []))
        word_count = max(25, min(120, raw_words + sub_count * 8))

        formatted_topics.append({
            "title": title,
            "subtopics": subs[:8],
            "subtopic_count": max(1, sub_count),
            "word_count": word_count,
            "kind": kind,
        })

    return {
        "course_name": course_name,
        "topics": formatted_topics[:25],
        "warning": warning,
    }
