import { describe, it, expect } from "vitest";
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  ACTION_TYPE_LABELS,
  EXTRACT_FIELD_LABELS,
  type NodeType,
  type ActionType,
  type ExtractField,
} from "@/components/flowbuilder/types";

const ALL_NODE_TYPES: NodeType[] = [
  "start", "message", "question", "action", "condition", "end", "delay", "timer", "qualify",
];

const ALL_ACTION_TYPES: ActionType[] = [
  "send_media", "send_pdf", "send_video", "extract_data", "schedule_visit",
  "handoff", "ai_response", "check_party_availability", "check_visit_availability",
  "disable_followup", "disable_ai", "mark_existing_customer",
];

const ALL_EXTRACT_FIELDS: NonNullable<ExtractField>[] = [
  "customer_name", "event_date", "visit_date", "guest_count",
  "child_name", "child_age", "preferred_slot", "event_type",
];

describe("Flow Builder type maps", () => {
  it("every NodeType has a label", () => {
    ALL_NODE_TYPES.forEach((t) => expect(NODE_TYPE_LABELS[t]).toBeTruthy());
  });

  it("every NodeType has a color", () => {
    ALL_NODE_TYPES.forEach((t) => expect(NODE_TYPE_COLORS[t]).toBeTruthy());
  });

  it("node labels and colors have the same keys", () => {
    expect(Object.keys(NODE_TYPE_LABELS).sort()).toEqual(Object.keys(NODE_TYPE_COLORS).sort());
  });

  it("every ActionType has a label", () => {
    ALL_ACTION_TYPES.forEach((a) => expect(ACTION_TYPE_LABELS[a]).toBeTruthy());
  });

  it("every ExtractField has a label", () => {
    ALL_EXTRACT_FIELDS.forEach((f) => expect(EXTRACT_FIELD_LABELS[f]).toBeTruthy());
  });
});
