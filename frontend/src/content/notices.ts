/**
 * Typed re-export of content/notices.json — the single source of truth for
 * all AI/legal notice text shared between backend and frontend.
 *
 * Import from here instead of hardcoding notice strings:
 *
 *   import { notices } from '@/content/notices';
 *   <p>{notices.persistent_banner.text}</p>
 */

import raw from '@content/notices.json';

/* ---- Type definitions (mirrors the JSON schema) ---- */

export interface ExportDisclaimer {
  heading: string;
  body: string;
  pdf_footer: string;
}

export interface PersistentBanner {
  text: string;
}

export interface RcaDisclaimer {
  text: string;
}

export interface AiBadge {
  label: string;
}

export interface ExecutiveSummary {
  subtitle: string;
}

export interface Notices {
  _version: string;
  _description: string;
  export_disclaimer: ExportDisclaimer;
  persistent_banner: PersistentBanner;
  rca_disclaimer: RcaDisclaimer;
  ai_badge: AiBadge;
  executive_summary: ExecutiveSummary;
}

/** Typed notices content — single source of truth from content/notices.json */
export const notices = raw as Notices;

/* ---- Convenience re-exports (most-used values) ---- */

export const PERSISTENT_AI_NOTICE = notices.persistent_banner.text;
export const RCA_AI_DISCLAIMER = notices.rca_disclaimer.text;
export const AI_BADGE_LABEL = notices.ai_badge.label;
export const EXPORT_DISCLAIMER_HEADING = notices.export_disclaimer.heading;
export const EXPORT_DISCLAIMER_BODY = notices.export_disclaimer.body;
