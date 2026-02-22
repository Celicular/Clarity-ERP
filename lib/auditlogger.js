/**
 * lib/auditlogger.js
 * Centralized internal helper for recording system audit events.
 */

import { query } from "./db";

/**
 * Creates an audit log entry in the database.
 * 
 * @param {Object} params
 * @param {string} params.action - Event type (e.g. 'USER_LOGIN', 'PROJECT_CREATED', 'ROLE_UPDATE')
 * @param {string} [params.criticality='Low'] - 'Low', 'Medium', 'High', 'Critical'
 * @param {string|null} [params.done_by=null] - The user ID who performed the action (null if system action)
 * @param {string|null} [params.done_by_ip=null] - The IP address of the user
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function logAudit({ action, criticality = "Low", done_by = null, done_by_ip = null }) {
  try {
    // Generate simple unique ID
    const id = "al_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    
    await query(
      `INSERT INTO auditlogs (id, action, criticality, done_by, done_by_ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, action, criticality, done_by, done_by_ip]
    );

    return true;
  } catch (error) {
    console.error("[AUDIT LOG ERROR] Failed to write audit log:", error);
    // Suppress throwing to avoid breaking the main business logic flow that triggered the log
    return false;
  }
}
