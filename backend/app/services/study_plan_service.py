"""
Study Plan & Syllabus Service for StudyForge.

Provides the end-to-end student flow:
1. Syllabus Upload & Parsing (PDF, Word, PPTX, Excel, Images, Text)
2. Topic Effort Estimation via trained MLP / ONNX model
3. YouTube Lecture Matching with caching and error degradation
4. Weekly Plan Generation (hardest topics first, light review slot)
5. Dynamic Missed-Day Rebalancing (plain student language, no ML jargon)
6. Dynamic Dashboard Aggregation
"""
import json
import logging
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.syllabus import Syllabus, Topic
from ..models.plan import Plan, PlanItem
from ..schemas.syllabus import SyllabusResponse, TopicResponse
from ..schemas.plan import PlanResponse, PlanItemResponse, MissedDayResponse, DashboardResponse
from .predictor_service import predictor_service
from .youtube_service import find_youtube_lectures

logger = logging.getLogger(__name__)

DAY_NAMES_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _format_time(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} min"
    h = minutes // 60
    m = minutes % 60
    return f"{h}h {m}m" if m > 0 else f"{h}h"


class StudyPlanService:

    def upload_and_process_syllabus(
        self,
        data: bytes,
        filename: str,
        content_type: str,
        user_id: Optional[int],
        db: Session
    ) -> SyllabusResponse:
        """Process real uploaded file into structured syllabus topics."""
        from document_extractor import extract_text
        from syllabus_parser import parse_syllabus

        extracted_text, method = extract_text(data, filename=filename, content_type=content_type)
        if not extracted_text or not extracted_text.strip():
            raise ValueError(
                "We couldn't find any readable text in this file. "
                "If it's a photo or scan, make sure the text is sharp and well-lit, or upload a PDF with selectable text."
            )

        parsed = parse_syllabus(extracted_text, extraction_method=method)
        raw_topics = parsed.get("topics", [])
        if not raw_topics:
            raise ValueError(
                "Could not identify structured topics in this document. "
                "Please make sure your document contains course units, numbered items, or topic bullet points."
            )

        course_name = parsed.get("course_name") or "Course Syllabus"
        warning = parsed.get("warning")

        # Create database record
        syllabus = Syllabus(
            user_id=user_id,
            filename=filename,
            course_name=course_name,
            raw_text=extracted_text,
            is_sample=False,
            warning=warning,
        )
        db.add(syllabus)
        db.commit()
        db.refresh(syllabus)

        topic_objects = []
        total_minutes = 0

        for i, t in enumerate(raw_topics):
            # Evaluate effort model
            pred = predictor_service.predict(
                topic_name=t["title"],
                subtopic_count=t["subtopic_count"],
                topic_type=t["kind"],
                desc_word_count=t["word_count"]
            )

            est_min = pred["estimated_minutes"]
            total_minutes += est_min

            topic_obj = Topic(
                syllabus_id=syllabus.id,
                title=t["title"],
                subtopics_json=json.dumps(t.get("subtopics", [])),
                subtopic_count=t["subtopic_count"],
                word_count=t["word_count"],
                kind=t["kind"],
                estimated_minutes=est_min,
                difficulty=pred["difficulty"],
                reason=pred["reason"],
                order_index=i,
                done=False,
            )
            db.add(topic_obj)
            topic_objects.append(topic_obj)

        db.commit()

        # Prefetch lectures for first 3 topics in background/cache
        for topic_obj in topic_objects[:3]:
            try:
                find_youtube_lectures(topic_obj.title, course_name, db=db, max_results=3)
            except Exception as e:
                logger.warning("Lecture prefetch error: %s", e)

        # Build response
        topic_responses = []
        for t in topic_objects:
            db.refresh(t)
            # Check cached video status
            cached_res = find_youtube_lectures(t.title, course_name, db=db, max_results=1)
            top_video = cached_res["videos"][0] if cached_res.get("videos") else None

            topic_responses.append(TopicResponse(
                id=t.id,
                title=t.title,
                subtopics=t.subtopics,
                subtopic_count=t.subtopic_count,
                word_count=t.word_count,
                kind=t.kind,
                estimated_minutes=t.estimated_minutes,
                difficulty=t.difficulty,
                reason=t.reason,
                videos_status=cached_res.get("status", "ok"),
                top_video=top_video,
                order_index=t.order_index,
                done=t.done,
            ))

        return SyllabusResponse(
            syllabus_id=syllabus.id,
            course_name=course_name,
            filename=filename,
            is_sample=False,
            warning=warning,
            total_topics=len(topic_responses),
            total_estimated_minutes=total_minutes,
            topics=topic_responses,
        )

    def create_sample_syllabus(self, user_id: Optional[int], db: Session) -> SyllabusResponse:
        """Explicit demo syllabus with sample=true label."""
        sample_course = "CS 301: Algorithms & Data Structures"
        sample_topics_data = [
            ("Asymptotic Complexity & Big-O Notation", ["Best/Worst case", "Master theorem", "Recurrence trees"], "theory", 4, 35),
            ("Divide and Conquer: Sorting Algorithms", ["Merge Sort", "Quick Sort", "Median Finding"], "numerical", 5, 50),
            ("Graph Traversals & Dijkstra Shortest Path", ["BFS/DFS", "Priority queues", "DAG shortest paths"], "numerical", 6, 65),
            ("Relational Database Normalization & SQL", ["1NF to BCNF", "Functional dependencies", "Indexing"], "lab-heavy", 5, 55),
            ("Distributed Consensus & Fault Tolerance", ["Paxos", "Raft protocol", "Byzantine Generals"], "theory", 5, 60),
        ]

        syllabus = Syllabus(
            user_id=user_id,
            filename="sample_cs_syllabus.txt",
            course_name=sample_course,
            raw_text="Sample syllabus for demonstration.",
            is_sample=True,
            warning=None,
        )
        db.add(syllabus)
        db.commit()
        db.refresh(syllabus)

        topic_objects = []
        total_minutes = 0

        for i, (title, subs, kind, sub_count, word_count) in enumerate(sample_topics_data):
            pred = predictor_service.predict(title, sub_count, kind, word_count)
            est_min = pred["estimated_minutes"]
            total_minutes += est_min

            topic_obj = Topic(
                syllabus_id=syllabus.id,
                title=title,
                subtopics_json=json.dumps(subs),
                subtopic_count=sub_count,
                word_count=word_count,
                kind=kind,
                estimated_minutes=est_min,
                difficulty=pred["difficulty"],
                reason=pred["reason"],
                order_index=i,
                done=False,
            )
            db.add(topic_obj)
            topic_objects.append(topic_obj)

        db.commit()

        # Prefetch videos for demo topics
        for topic_obj in topic_objects[:3]:
            try:
                find_youtube_lectures(topic_obj.title, sample_course, db=db, max_results=3)
            except Exception as e:
                logger.warning("Sample lecture prefetch error: %s", e)

        topic_responses = []
        for t in topic_objects:
            db.refresh(t)
            cached_res = find_youtube_lectures(t.title, sample_course, db=db, max_results=1)
            top_video = cached_res["videos"][0] if cached_res.get("videos") else None

            topic_responses.append(TopicResponse(
                id=t.id,
                title=t.title,
                subtopics=t.subtopics,
                subtopic_count=t.subtopic_count,
                word_count=t.word_count,
                kind=t.kind,
                estimated_minutes=t.estimated_minutes,
                difficulty=t.difficulty,
                reason=t.reason,
                videos_status=cached_res.get("status", "ok"),
                top_video=top_video,
                order_index=t.order_index,
                done=t.done,
            ))

        return SyllabusResponse(
            syllabus_id=syllabus.id,
            course_name=sample_course,
            filename="sample_cs_syllabus.txt",
            is_sample=True,
            warning=None,
            total_topics=len(topic_responses),
            total_estimated_minutes=total_minutes,
            topics=topic_responses,
        )

    def create_weekly_plan(
        self,
        syllabus_id: int,
        user_id: Optional[int],
        start_date_str: Optional[str],
        hours_per_day: float,
        study_days: List[str],
        exam_date_str: Optional[str],
        db: Session
    ) -> PlanResponse:
        """
        Builds a weekly schedule spreading topics hardest first across study days,
        with a light review slot on the final day.
        """
        syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
        if not syllabus:
            raise ValueError(f"Syllabus with id {syllabus_id} does not exist.")

        topics = db.query(Topic).filter(Topic.syllabus_id == syllabus_id).all()
        if not topics:
            raise ValueError("No topics found for this syllabus.")

        # Sort topics: hardest first (hard > medium > easy), then highest minutes
        diff_weight = {"hard": 3, "medium": 2, "easy": 1}
        sorted_topics = sorted(
            topics,
            key=lambda t: (diff_weight.get(t.difficulty, 2), t.estimated_minutes),
            reverse=True
        )

        # Parse start date
        if start_date_str:
            try:
                curr_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                curr_date = date.today()
        else:
            curr_date = date.today()

        valid_days = [d[:3].capitalize() for d in (study_days or ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])]

        # Generate calendar of study dates
        study_calendar: List[date] = []
        check_date = curr_date
        while len(study_calendar) < max(len(sorted_topics) + 1, 6):
            day_name = check_date.strftime("%a")
            if day_name in valid_days:
                study_calendar.append(check_date)
            check_date += timedelta(days=1)

        # Create Plan
        plan = Plan(
            user_id=user_id,
            syllabus_id=syllabus_id,
            start_date=curr_date.isoformat(),
            hours_per_day=hours_per_day,
            study_days_json=json.dumps(valid_days),
            exam_date=exam_date_str,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        plan_items = []
        total_min = 0

        # Assign topics to study dates
        for idx, topic in enumerate(sorted_topics):
            target_date = study_calendar[idx % len(study_calendar)]
            item = PlanItem(
                plan_id=plan.id,
                topic_id=topic.id,
                date=target_date.isoformat(),
                minutes=topic.estimated_minutes,
                done=topic.done,
                is_review=False,
                notes=f"{topic.difficulty.capitalize()} difficulty • {topic.kind}",
            )
            db.add(item)
            plan_items.append(item)
            total_min += topic.estimated_minutes

        # Add light review slot on the final study day
        review_date = study_calendar[-1]
        review_item = PlanItem(
            plan_id=plan.id,
            topic_id=None,
            date=review_date.isoformat(),
            minutes=35,
            done=False,
            is_review=True,
            notes="Weekly Knowledge Consolidation & Practice Review",
        )
        db.add(review_item)
        plan_items.append(review_item)
        total_min += 35

        db.commit()

        # Build response
        items_resp = []
        completed_min = 0
        for item in plan_items:
            db.refresh(item)
            if item.done:
                completed_min += item.minutes
            t_obj = item.topic
            d_obj = datetime.strptime(item.date, "%Y-%m-%d").date()

            top_vid = None
            if t_obj:
                cached_res = find_youtube_lectures(t_obj.title, syllabus.course_name, db=db, max_results=1)
                if cached_res.get("videos"):
                    top_vid = cached_res["videos"][0]

            items_resp.append(PlanItemResponse(
                id=item.id,
                plan_id=item.plan_id,
                topic_id=item.topic_id,
                topic_title=t_obj.title if t_obj else "Weekly Review & Consolidation",
                date=item.date,
                day_of_week=d_obj.strftime("%a"),
                minutes=item.minutes,
                done=item.done,
                is_review=item.is_review,
                notes=item.notes or "",
                top_video=top_vid,
            ))

        pct = round((completed_min / max(1, total_min)) * 100, 1)

        return PlanResponse(
            id=plan.id,
            syllabus_id=syllabus_id,
            course_name=syllabus.course_name,
            start_date=plan.start_date,
            hours_per_day=plan.hours_per_day,
            study_days=plan.study_days,
            exam_date=plan.exam_date,
            total_minutes=total_min,
            completed_minutes=completed_min,
            progress_percent=pct,
            items=items_resp,
        )

    def update_topic_progress(self, topic_id: int, done: bool, db: Session) -> TopicResponse:
        """Mark a topic done/undone and synchronize associated plan items."""
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if not topic:
            raise ValueError(f"Topic with id {topic_id} was not found.")

        topic.done = done
        # Also mark plan items
        plan_items = db.query(PlanItem).filter(PlanItem.topic_id == topic_id).all()
        for pi in plan_items:
            pi.done = done

        db.commit()
        db.refresh(topic)

        course_name = topic.syllabus.course_name if topic.syllabus else ""
        cached_res = find_youtube_lectures(topic.title, course_name, db=db, max_results=1)
        top_vid = cached_res["videos"][0] if cached_res.get("videos") else None

        return TopicResponse(
            id=topic.id,
            title=topic.title,
            subtopics=topic.subtopics,
            subtopic_count=topic.subtopic_count,
            word_count=topic.word_count,
            kind=topic.kind,
            estimated_minutes=topic.estimated_minutes,
            difficulty=topic.difficulty,
            reason=topic.reason,
            videos_status=cached_res.get("status", "ok"),
            top_video=top_vid,
            order_index=topic.order_index,
            done=topic.done,
        )

    def rebalance_missed_day(self, plan_id: int, missed_date: str, db: Session) -> MissedDayResponse:
        """
        Rebalances uncompleted topics from a missed day across remaining study days.
        Communicates clearly in plain student terms (NO ML jargon).
        """
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plan with id {plan_id} was not found.")

        all_items = db.query(PlanItem).filter(PlanItem.plan_id == plan_id).order_by(PlanItem.date, PlanItem.id).all()
        missed_items = [i for i in all_items if i.date == missed_date and not i.done]

        # Calculate before daily minutes
        before_daily: Dict[str, int] = {}
        for i in all_items:
            before_daily[i.date] = before_daily.get(i.date, 0) + i.minutes

        if not missed_items:
            return MissedDayResponse(
                plan_id=plan_id,
                missed_date=missed_date,
                missed_minutes=0,
                explanation="No pending study tasks were scheduled on this date.",
                before_daily_minutes=before_daily,
                after_daily_minutes=before_daily,
                items=[PlanItemResponse.model_validate(i) for i in all_items],
            )

        missed_min = sum(i.minutes for i in missed_items)
        missed_dt = datetime.strptime(missed_date, "%Y-%m-%d").date()
        missed_day_name = missed_dt.strftime("%A")

        # Future study dates in this plan
        future_dates = sorted(list({i.date for i in all_items if i.date > missed_date and not i.done}))

        if not future_dates:
            # Add an extra catch-up study day
            next_day = missed_dt + timedelta(days=1)
            future_dates = [next_day.isoformat()]

        # Rebalance: shift missed items forward across the future dates
        for idx, item in enumerate(missed_items):
            target_date = future_dates[idx % len(future_dates)]
            item.date = target_date

        plan.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Calculate after daily minutes
        after_daily: Dict[str, int] = {}
        for i in all_items:
            db.refresh(i)
            after_daily[i.date] = after_daily.get(i.date, 0) + i.minutes

        num_days = len(future_dates)
        avg_extra = round(missed_min / num_days)

        explanation = (
            f"We redistributed {missed_min} minutes from {missed_day_name} "
            f"across your remaining {num_days} study day{'s' if num_days > 1 else ''} "
            f"(+{avg_extra} min/day) so your weekly plan stays on track without weekend burnout."
        )

        items_resp = []
        for i in all_items:
            d_obj = datetime.strptime(i.date, "%Y-%m-%d").date()
            t_obj = i.topic
            top_vid = None
            if t_obj:
                cached_res = find_youtube_lectures(t_obj.title, "", db=db, max_results=1)
                if cached_res.get("videos"):
                    top_vid = cached_res["videos"][0]

            items_resp.append(PlanItemResponse(
                id=i.id,
                plan_id=i.plan_id,
                topic_id=i.topic_id,
                topic_title=t_obj.title if t_obj else "Weekly Review & Consolidation",
                date=i.date,
                day_of_week=d_obj.strftime("%a"),
                minutes=i.minutes,
                done=i.done,
                is_review=i.is_review,
                notes=i.notes or "",
                top_video=top_vid,
            ))

        return MissedDayResponse(
            plan_id=plan_id,
            missed_date=missed_date,
            missed_minutes=missed_min,
            explanation=explanation,
            before_daily_minutes=before_daily,
            after_daily_minutes=after_daily,
            items=items_resp,
        )

    def get_dashboard(self, user_id: Optional[int], db: Session) -> DashboardResponse:
        """
        Aggregates dashboard data: next unfinished topic with its top video,
        progress %, and today's tasks. Returns clean empty state when no plan exists.
        """
        # Query plan for user, or latest plan in DB if guest
        query = db.query(Plan)
        if user_id is not None:
            query = query.filter(Plan.user_id == user_id)
        plan = query.order_by(Plan.id.desc()).first()

        if not plan:
            return DashboardResponse(
                has_plan=False,
                course_name=None,
                next_topic=None,
                today_tasks=[],
                progress_percent=0.0,
                total_topics=0,
                completed_topics=0,
                total_minutes=0,
                completed_minutes=0,
            )

        items = db.query(PlanItem).filter(PlanItem.plan_id == plan.id).order_by(PlanItem.date, PlanItem.id).all()
        if not items:
            return DashboardResponse(has_plan=False)

        total_min = sum(i.minutes for i in items)
        completed_min = sum(i.minutes for i in items if i.done)
        progress_pct = round((completed_min / max(1, total_min)) * 100, 1)

        # Count topics
        topic_items = [i for i in items if i.topic_id is not None]
        total_topics = len(topic_items)
        completed_topics = len([i for i in topic_items if i.done])

        # Next unfinished topic
        next_item = next((i for i in items if not i.done and i.topic_id is not None), None)
        next_topic_data = None

        course_title = plan.syllabus.course_name if plan.syllabus else "Course Syllabus"

        if next_item and next_item.topic:
            t = next_item.topic
            cached_res = find_youtube_lectures(t.title, course_title, db=db, max_results=1)
            top_video = cached_res["videos"][0] if cached_res.get("videos") else None

            next_topic_data = {
                "id": t.id,
                "title": t.title,
                "difficulty": t.difficulty,
                "estimated_minutes": t.estimated_minutes,
                "formatted_time": _format_time(t.estimated_minutes),
                "reason": t.reason,
                "date": next_item.date,
                "top_video": top_vid if (top_vid := top_video) else None,
            }

        # Today's tasks (or upcoming tasks)
        today_str = date.today().isoformat()
        today_items = [i for i in items if i.date == today_str]
        if not today_items:
            # If no tasks scheduled exactly today, show unfinished tasks for the next upcoming date
            upcoming_dates = sorted(list({i.date for i in items if i.date >= today_str and not i.done}))
            if upcoming_dates:
                today_items = [i for i in items if i.date == upcoming_dates[0]]
            else:
                today_items = [i for i in items if not i.done][:3]

        today_tasks_resp = []
        for i in today_items:
            d_obj = datetime.strptime(i.date, "%Y-%m-%d").date()
            t_obj = i.topic
            top_vid = None
            if t_obj:
                cached_res = find_youtube_lectures(t_obj.title, course_title, db=db, max_results=1)
                if cached_res.get("videos"):
                    top_vid = cached_res["videos"][0]

            today_tasks_resp.append(PlanItemResponse(
                id=i.id,
                plan_id=i.plan_id,
                topic_id=i.topic_id,
                topic_title=t_obj.title if t_obj else "Weekly Review & Consolidation",
                date=i.date,
                day_of_week=d_obj.strftime("%a"),
                minutes=i.minutes,
                done=i.done,
                is_review=i.is_review,
                notes=i.notes or "",
                top_video=top_vid,
            ))

        return DashboardResponse(
            has_plan=True,
            course_name=course_title,
            next_topic=next_topic_data,
            today_tasks=today_tasks_resp,
            progress_percent=progress_pct,
            total_topics=total_topics,
            completed_topics=completed_topics,
            total_minutes=total_min,
            completed_minutes=completed_min,
        )


study_plan_service = StudyPlanService()
