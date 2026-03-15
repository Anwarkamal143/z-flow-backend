import { WorkflowEvents } from "@/flow-executions/events/workflow";
import { EventSchemas } from "inngest";

/**
 * ---- Event Definitions ----
 * Add all your events here
 */

/**
 * ---- Combined Event Union ----
 * Add new events to this union
 */
export type AppEvents = WorkflowEvents;

/**
 * ---- Inngest Event Schemas ----
 */
export const schemas = new EventSchemas().fromUnion<AppEvents>();

/**
 * ---- Extract Event Names ----
 */
export type EventNames = AppEvents["name"];

/**
 * ---- EventName → Full Event ----
 */
export type EventMap = {
  [E in AppEvents as E["name"]]: E;
};

/**
 * ---- EventName → Event Data ----
 */
export type EventDataMap = {
  [E in AppEvents as E["name"]]: E["data"];
};
