#!/usr/bin/env python3

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


def utc_now_iso() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc, microsecond=0).isoformat().replace("+00:00", "Z")


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id TEXT PRIMARY KEY,
            submitted_at TEXT NOT NULL,
            name TEXT,
            email TEXT,
            role TEXT,
            event_request_type TEXT,
            message TEXT,
            event_name TEXT,
            event_description TEXT,
            first_event_date_local TEXT,
            first_event_date_iso TEXT,
            frequency TEXT,
            monthly_pattern TEXT,
            monthly_ordinal TEXT,
            monthly_weekday TEXT,
            monthly_monthday INTEGER,
            monthly_other_text TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at
        ON contact_submissions (submitted_at DESC)
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS event_submissions (
            id TEXT PRIMARY KEY,
            submitted_at TEXT NOT NULL,
            role TEXT,
            event_request_type TEXT,
            event_name TEXT,
            event_description TEXT,
            first_event_date_local TEXT,
            first_event_date_iso TEXT,
            frequency TEXT,
            monthly_pattern TEXT,
            monthly_ordinal TEXT,
            monthly_weekday TEXT,
            monthly_monthday INTEGER,
            monthly_other_text TEXT,
            contact_name TEXT,
            contact_email TEXT,
            message TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_event_submissions_submitted_at
        ON event_submissions (submitted_at DESC)
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            slug TEXT,
            name TEXT NOT NULL,
            venue TEXT NOT NULL,
            address TEXT,
            city TEXT,
            event_date TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time_local TEXT NOT NULL,
            signup_time_local TEXT,
            cost TEXT,
            type TEXT NOT NULL,
            frequency TEXT NOT NULL,
            signup_method TEXT,
            contact TEXT,
            website TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_events_columns(conn)
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_events_day_time
        ON events (day_of_week ASC, start_time_local ASC)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_events_event_date
        ON events (event_date ASC, start_time_local ASC)
        """
    )
    conn.commit()


def ensure_events_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(events)").fetchall()}
    if "event_date" not in columns:
        conn.execute("ALTER TABLE events ADD COLUMN event_date TEXT")
        conn.execute("UPDATE events SET event_date = '' WHERE event_date IS NULL")
    if "slug" not in columns:
        conn.execute("ALTER TABLE events ADD COLUMN slug TEXT")


def save_contact(conn: sqlite3.Connection, payload: Dict[str, Any]) -> Dict[str, Any]:
    record = payload.get("record") or {}
    contact = record.get("contact") or {}
    event = record.get("event") or {}
    conn.execute(
        """
        INSERT OR REPLACE INTO contact_submissions (
            id, submitted_at, name, email, role, event_request_type, message,
            event_name, event_description, first_event_date_local, first_event_date_iso,
            frequency, monthly_pattern, monthly_ordinal, monthly_weekday,
            monthly_monthday, monthly_other_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record.get("id"),
            record.get("submittedAt"),
            contact.get("name"),
            contact.get("email"),
            contact.get("role"),
            record.get("eventRequestType"),
            record.get("message"),
            event.get("name"),
            event.get("description"),
            event.get("firstEventDateLocal"),
            event.get("firstEventDateIso"),
            event.get("frequency"),
            event.get("monthlyPattern"),
            event.get("monthlyOrdinal"),
            event.get("monthlyWeekday"),
            event.get("monthlyMonthday"),
            event.get("monthlyOtherText")
        )
    )
    conn.commit()
    return {"id": record.get("id")}


def save_event_submission(conn: sqlite3.Connection, payload: Dict[str, Any]) -> Dict[str, Any]:
    record = payload.get("record") or {}
    conn.execute(
        """
        INSERT OR REPLACE INTO event_submissions (
            id, submitted_at, role, event_request_type, event_name, event_description,
            first_event_date_local, first_event_date_iso, frequency, monthly_pattern,
            monthly_ordinal, monthly_weekday, monthly_monthday, monthly_other_text,
            contact_name, contact_email, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record.get("id"),
            record.get("submittedAt"),
            record.get("role"),
            record.get("eventRequestType"),
            record.get("eventName"),
            record.get("eventDescription"),
            record.get("firstEventDateLocal"),
            record.get("firstEventDateIso"),
            record.get("frequency"),
            record.get("monthlyPattern"),
            record.get("monthlyOrdinal"),
            record.get("monthlyWeekday"),
            record.get("monthlyMonthday"),
            record.get("monthlyOtherText"),
            (record.get("contact") or {}).get("name"),
            (record.get("contact") or {}).get("email"),
            record.get("message")
        )
    )
    conn.commit()
    return {"id": record.get("id")}


def rows_to_event_submissions(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for row in rows:
        items.append(
            {
                "id": row["id"],
                "submittedAt": row["submitted_at"],
                "role": row["role"],
                "eventRequestType": row["event_request_type"],
                "eventName": row["event_name"],
                "eventDescription": row["event_description"],
                "firstEventDateLocal": row["first_event_date_local"],
                "firstEventDateIso": row["first_event_date_iso"],
                "frequency": row["frequency"],
                "monthlyPattern": row["monthly_pattern"],
                "monthlyOrdinal": row["monthly_ordinal"],
                "monthlyWeekday": row["monthly_weekday"],
                "monthlyMonthday": row["monthly_monthday"],
                "monthlyOtherText": row["monthly_other_text"],
                "contact": {
                    "name": row["contact_name"],
                    "email": row["contact_email"]
                },
                "message": row["message"]
            }
        )
    return items


def list_event_submissions(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    cursor = conn.execute(
        """
        SELECT *
        FROM event_submissions
        ORDER BY datetime(submitted_at) DESC
        """
    )
    rows = cursor.fetchall()
    return rows_to_event_submissions(rows)


def upsert_events(conn: sqlite3.Connection, payload: Dict[str, Any]) -> Dict[str, Any]:
    events: List[Dict[str, Any]] = payload.get("events") or []
    inserted = 0
    updated = 0
    now = utc_now_iso()
    for ev in events:
        ev_id = ev.get("id")
        if not ev_id:
            continue
        event_date = ev.get("eventDate") or ev.get("event_date")
        if not event_date:
            continue
        exists = conn.execute("SELECT created_at FROM events WHERE id = ?", (ev_id,)).fetchone()
        created_value = exists["created_at"] if exists else now
        conn.execute(
            """
            INSERT INTO events (
                id, slug, name, venue, address, city, event_date, day_of_week, start_time_local,
                signup_time_local, cost, type, frequency, signup_method,
                contact, website, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                slug=excluded.slug,
                name=excluded.name,
                venue=excluded.venue,
                address=excluded.address,
                city=excluded.city,
                event_date=excluded.event_date,
                day_of_week=excluded.day_of_week,
                start_time_local=excluded.start_time_local,
                signup_time_local=excluded.signup_time_local,
                cost=excluded.cost,
                type=excluded.type,
                frequency=excluded.frequency,
                signup_method=excluded.signup_method,
                contact=excluded.contact,
                website=excluded.website,
                notes=excluded.notes,
                updated_at=excluded.updated_at
            """,
            (
                ev_id,
                ev.get("slug"),
                ev.get("name"),
                ev.get("venue"),
                ev.get("address"),
                ev.get("city"),
                event_date,
                ev.get("dayOfWeek"),
                ev.get("startTimeLocal"),
                ev.get("signupTimeLocal"),
                ev.get("cost"),
                ev.get("type"),
                ev.get("frequency"),
                ev.get("signupMethod"),
                ev.get("contact"),
                ev.get("website"),
                ev.get("notes"),
                created_value,
                now
            )
        )
        if exists:
            updated += 1
        else:
            inserted += 1
    conn.commit()
    return {"inserted": inserted, "updated": updated, "total": inserted + updated}


def list_events(conn: sqlite3.Connection, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    start = payload.get("start")
    end = payload.get("end")
    query = "SELECT * FROM events"
    params: List[Any] = []
    if start and end:
        query += " WHERE event_date >= ? AND event_date < ?"
        params.extend([start, end])
    query += " ORDER BY event_date ASC, start_time_local ASC"
    rows = conn.execute(query, params).fetchall()
    events: List[Dict[str, Any]] = []
    for row in rows:
        events.append(
            {
                "id": row["id"],
                "slug": row["slug"],
                "name": row["name"],
                "venue": row["venue"],
                "address": row["address"],
                "city": row["city"],
                "eventDate": row["event_date"],
                "dayOfWeek": row["day_of_week"],
                "startTimeLocal": row["start_time_local"],
                "signupTimeLocal": row["signup_time_local"],
                "cost": row["cost"],
                "type": row["type"],
                "frequency": row["frequency"],
                "signupMethod": row["signup_method"],
                "contact": row["contact"],
                "website": row["website"],
                "notes": row["notes"]
            }
        )
    return events


def dispatch(conn: sqlite3.Connection, action: str, payload: Dict[str, Any]) -> Any:
    if action == "init":
        return {"ok": True}
    if action == "save_contact":
        return save_contact(conn, payload)
    if action == "save_event_submission":
        return save_event_submission(conn, payload)
    if action == "list_event_submissions":
        return list_event_submissions(conn)
    if action == "upsert_events":
        return upsert_events(conn, payload)
    if action == "list_events":
        return list_events(conn, payload)
    raise ValueError(f"unknown action {action}")


def main() -> None:
    raw = sys.stdin.read()
    if not raw:
        print(json.dumps({"ok": False, "error": "missing payload"}))
        sys.exit(1)
    data = json.loads(raw)
    action = data.get("action")
    db_path = data.get("dbPath")
    payload = data.get("payload") or {}
    if not action:
        print(json.dumps({"ok": False, "error": "missing action"}))
        sys.exit(1)
    if not db_path:
        print(json.dumps({"ok": False, "error": "missing dbPath"}))
        sys.exit(1)
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    ensure_schema(conn)
    try:
        result = dispatch(conn, action, payload)
        print(json.dumps({"ok": True, "result": result}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
